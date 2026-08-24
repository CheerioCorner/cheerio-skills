#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

function locateNlm() {
  const res = spawnSync('nlm', ['--version'], { encoding: 'utf8' });
  if (res.status === 0) {
    return 'nlm';
  }
  
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\User';
  const defaultPath = path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', 'nlm.exe');
  const resDefault = spawnSync(defaultPath, ['--version'], { encoding: 'utf8' });
  if (resDefault.status === 0) {
    return defaultPath;
  }
  
  return 'nlm';
}

// 已驗證的最低版本，見 references/nlm-upgrade-guide.md「已知參數快照」。
// 每次升級驗證通過後，兩處要一起更新。
const MIN_VERSION = '0.9.14';

function versionAtLeast(version, min) {
  const v = version.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < Math.max(v.length, m.length); i++) {
    const a = v[i] || 0;
    const b = m[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true; // equal
}

function runCheck() {
  const nlmPath = locateNlm();

  // Parse profile arg
  let profile = null;
  const args = process.argv;
  const profileIndex = args.indexOf('--profile');
  if (profileIndex !== -1 && profileIndex + 1 < args.length) {
    profile = args[profileIndex + 1];
  } else {
    // If not specified, get default profile from nlm config
    const resConfig = spawnSync(nlmPath, ['config', 'get', 'auth.default_profile'], { encoding: 'utf8' });
    if (resConfig.status === 0) {
      profile = resConfig.stdout.trim();
    }
  }

  const status = {
    provider: 'notebooklm',
    cli_available: false,
    cli_version: null,
    cli_version_ok: false,
    min_version_required: MIN_VERSION,
    authenticated: false,
    // 不猜測預設值——沒偵測到就是 null，呼叫端要自己從 profiles_available 挑，
    // 不要沿用舊版寫死 'work' 的行為（曾經導致 spec.json 指定了不存在的 profile）。
    profile: profile || null,
    profiles_available: [],
    notebooks_count: null,
    ready: false
  };

  // 1. Check version
  const resVer = spawnSync(nlmPath, ['--version'], { encoding: 'utf8' });
  if (resVer.status === 0) {
    status.cli_available = true;
    const match = resVer.stdout.match(/version\s+([0-9.]+)/i);
    if (match) {
      status.cli_version = match[1];
      status.cli_version_ok = versionAtLeast(status.cli_version, MIN_VERSION);
    }
  } else {
    console.log(JSON.stringify(status, null, 2));
    process.exit(1);
  }
  
  // 2. Check profiles
  const resProfiles = spawnSync(nlmPath, ['login', 'profile', 'list'], { encoding: 'utf8' });
  if (resProfiles.status === 0) {
    const lines = resProfiles.stdout.split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([a-zA-Z0-9_-]+):/);
      if (m) {
        status.profiles_available.push(m[1]);
      }
    }
  }
  
  // 3. Check auth status for target profile
  const authArgs = ['login', '--check'];
  if (status.profile) {
    authArgs.push('--profile', status.profile);
  }
  const resAuth = spawnSync(nlmPath, authArgs, { encoding: 'utf8' });
  if (resAuth.status === 0) {
    status.authenticated = true;
  }
  
  // 4. Check notebooks count if authenticated
  if (status.authenticated) {
    const listArgs = ['list', 'notebooks', '--json'];
    if (status.profile) {
      listArgs.push('--profile', status.profile);
    }
    const resNotebooks = spawnSync(nlmPath, listArgs, { encoding: 'utf8' });
    if (resNotebooks.status === 0) {
      try {
        const notebooks = JSON.parse(resNotebooks.stdout);
        if (Array.isArray(notebooks)) {
          status.notebooks_count = notebooks.length;
        } else if (notebooks && Array.isArray(notebooks.notebooks)) {
          status.notebooks_count = notebooks.notebooks.length;
        }
      } catch (err) {
        // Fallback or ignore parse errors
      }
    }
  }
  
  status.ready = status.cli_available && status.cli_version_ok && status.authenticated;
  
  console.log(JSON.stringify(status, null, 2));
  if (!status.ready) {
    process.exit(1);
  }
}

if (require.main === module) {
  runCheck();
}
