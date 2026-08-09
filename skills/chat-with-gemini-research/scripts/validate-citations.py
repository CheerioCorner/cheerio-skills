#!/usr/bin/env python3
"""
驗證 Gemini 深度研究報告的引用完整性與來源品質。

用法：
    python validate-citations.py <report.md>

輸出：
    - 引用統計（總數、已驗證、缺失）
    - 來源品質分級（Tier 1/2/3）
    - 缺失引用的段落
    - 品質評分
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Set


def extract_citations(text: str) -> Dict[int, List[str]]:
    """提取所有 [REF-N] 標記及其上下文。"""
    citations = {}
    pattern = r'\[REF-(\d+)\]'
    
    for match in re.finditer(pattern, text):
        ref_num = int(match.group(1))
        start = max(0, match.start() - 100)
        context = text[start:match.start()].strip()
        sentences = re.split(r'[。！？\.\!\?]', context)
        last_sentence = sentences[-1].strip() if sentences else context
        
        if ref_num not in citations:
            citations[ref_num] = []
        citations[ref_num].append(last_sentence)
    
    return citations


def extract_reference_list(text: str) -> Dict[int, Dict]:
    """提取來源列表中的引用，包含 Tier 資訊。"""
    refs = {}
    # 找出表格格式的來源列表（支援 Tier 標記）
    table_pattern = r'\|\s*(\d+)\s*\|\s*(T[123]|Tier\s*[123]|)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|'
    
    for match in re.finditer(table_pattern, text):
        ref_num = int(match.group(1))
        tier_str = match.group(2).strip().upper()
        url = match.group(3).strip()
        title = match.group(4).strip()
        
        # 解析 Tier
        if '1' in tier_str:
            tier = 1
        elif '2' in tier_str:
            tier = 2
        elif '3' in tier_str:
            tier = 3
        else:
            # 根據 URL 猜測 Tier
            tier = guess_tier_from_url(url)
        
        refs[ref_num] = {
            'url': url,
            'title': title,
            'tier': tier
        }
    
    # 如果沒有找到 Tier 標記的表格，嘗試舊格式
    if not refs:
        old_pattern = r'\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|'
        for match in re.finditer(old_pattern, text):
            ref_num = int(match.group(1))
            url = match.group(2).strip()
            title = match.group(3).strip()
            tier = guess_tier_from_url(url)
            refs[ref_num] = {'url': url, 'title': title, 'tier': tier}
    
    return refs


def guess_tier_from_url(url: str) -> int:
    """根據 URL 猜測來源 Tier。"""
    if not url or url == 'N/A':
        return 3
    
    url_lower = url.lower()
    
    # Tier 1: 官方來源
    tier1_domains = [
        'github.com', 'gitlab.com', 'docs.', 'documentation.',
        'developer.', 'RFC', 'spec.', 'standard.',
        'arxiv.org', 'ieee.org', 'acm.org',
    ]
    for domain in tier1_domains:
        if domain.lower() in url_lower:
            return 1
    
    # Tier 2: 知名平台
    tier2_domains = [
        'stackoverflow.com', 'medium.com', 'dev.to',
        'techcrunch.com', 'theverge.com', 'arstechnica.com',
        'wikipedia.org', 'en.wikipedia.org',
    ]
    for domain in tier2_domains:
        if domain.lower() in url_lower:
            return 2
    
    # 預設 Tier 3
    return 3


def extract_unverified_claims(text: str) -> List[str]:
    """提取所有 [UNVERIFIED] 標記的陳述。"""
    claims = []
    pattern = r'(.{0,100}\[UNVERIFIED\])'
    
    for match in re.finditer(pattern, text):
        claim = match.group(1).strip()
        claims.append(claim)
    
    return claims


def extract_confidence_levels(text: str) -> Dict[str, int]:
    """統計各信心等級的數量。"""
    levels = {
        'VERIFIED': 0,
        'INFERRD': 0,
        'UNVERIFIED': 0,
        'CONTRADICTED': 0
    }
    
    for level in levels:
        pattern = f'\\[{level}\\]'
        levels[level] = len(re.findall(pattern, text))
    
    return levels


def extract_source_diversity(refs: Dict[int, Dict]) -> Set[str]:
    """提取不同來源網站的數量。"""
    domains = set()
    for ref in refs.values():
        url = ref.get('url', '')
        if url and url != 'N/A':
            # 簡單提取 domain
            match = re.match(r'https?://([^/]+)', url)
            if match:
                domains.add(match.group(1).lower())
    return domains


def validate_citations(report_path: str) -> Tuple[int, int, List[str], Dict, Set, List[str]]:
    """
    驗證報告的引用完整性。
    
    返回：
        (total_refs, validated_refs, missing_refs, tier_counts, domains, unverified_claims)
    """
    content = Path(report_path).read_text(encoding='utf-8')
    
    # 提取所有引用標記
    cited_refs = extract_citations(content)
    
    # 提取來源列表
    reference_list = extract_reference_list(content)
    
    # 提取未驗證陳述
    unverified_claims = extract_unverified_claims(content)
    
    # 統計 Tier
    tier_counts = {1: 0, 2: 0, 3: 0}
    for ref_num in reference_list:
        tier = reference_list[ref_num].get('tier', 3)
        tier_counts[tier] += 1
    
    # 提取多樣性
    domains = extract_source_diversity(reference_list)
    
    # 檢查缺失
    total = len(cited_refs)
    validated = 0
    missing = []
    
    for ref_num in cited_refs:
        if ref_num in reference_list:
            validated += 1
        else:
            missing.append(f"REF-{ref_num}")
    
    return total, validated, missing, tier_counts, domains, unverified_claims


def calculate_quality_score(
    total: int,
    validated: int,
    tier_counts: Dict[int, int],
    domains: Set[str],
    unverified_count: int
) -> float:
    """計算品質評分 (0-100)。"""
    if total == 0:
        return 0.0
    
    # 基礎分：已驗證比例 (40分)
    base_score = (validated / total) * 40
    
    # Tier 1 來源獎勵 (30分)
    tier1_ratio = tier_counts[1] / max(1, sum(tier_counts.values()))
    tier1_score = tier1_ratio * 30
    
    # 多樣性獎勵 (20分)
    diversity_score = min(20, len(domains) * 5)
    
    # 懲扣：未驗證陳述 (-10分)
    unverified_penalty = min(10, unverified_count * 2)
    
    # 懲扣：孤立來源（可選）
    
    return min(100, base_score + tier1_score + diversity_score - unverified_penalty)


def main():
    if len(sys.argv) < 2:
        print("用法：python validate-citations.py <report.md>")
        sys.exit(1)
    
    report_path = sys.argv[1]
    
    if not Path(report_path).exists():
        print(f"錯誤：找不到檔案 {report_path}")
        sys.exit(1)
    
    total, validated, missing, tier_counts, domains, unverified_claims = validate_citations(report_path)
    score = calculate_quality_score(total, validated, tier_counts, domains, len(unverified_claims))
    
    print("=" * 60)
    print("引用驗證報告")
    print("=" * 60)
    print(f"總引用數：{total}")
    print(f"已驗證：{validated}")
    print(f"缺失：{len(missing)}")
    print()
    
    print("來源品質分佈：")
    print(f"  Tier 1（高可信度）：{tier_counts[1]} 個")
    print(f"  Tier 2（中可信度）：{tier_counts[2]} 個")
    print(f"  Tier 3（低可信度）：{tier_counts[3]} 個")
    print(f"  來源多樣性：{len(domains)} 個不同網站")
    print()
    
    if missing:
        print("[警告]  缺失的引用：")
        for ref in missing:
            print(f"  - {ref}")
        print()
    
    if unverified_claims:
        print("未驗證的陳述：")
        for i, claim in enumerate(unverified_claims[:5], 1):
            print(f"  {i}. {claim[:80]}...")
        if len(unverified_claims) > 5:
            print(f"  ... 還有 {len(unverified_claims) - 5} 個")
        print()
    
    print(f"品質評分：{score:.1f}/100")
    print()
    
    # 評估建議
    if tier_counts[1] < 2:
        print("[提示] 建議：增加更多 Tier 1 來源（官方文檔、學術論文）")
    
    if len(domains) < 3:
        print("[提示] 建議：增加來源多樣性（不同網站）")
    
    if len(missing) > 0:
        print("[提示] 建議：補充缺失的引用")
    
    if score >= 80:
        print("[OK] 品質良好")
    elif score >= 60:
        print("[警告]  品質尚可，建議補充引用")
    else:
        print("[FAIL] 品質不足，需要加強引用")
    
    sys.exit(0 if score >= 60 else 1)


if __name__ == "__main__":
    main()
