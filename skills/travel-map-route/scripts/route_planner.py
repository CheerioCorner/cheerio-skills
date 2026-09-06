#!/usr/bin/env python3
"""
travel-map-route 動線規劃小工具。
給一批候選點的座標與預估停留時間，用最近鄰貪婪法排序、依每日可用時數分天，
輸出草案動線與超時/缺座標警示。

這只是輔助計算，不是最終答案——時段衝突（休館日/最後入場時間）、三餐時段安排、
套票划不划算，這些都要 agent 自己判斷，這支 script 只管地理距離與時間預算的機械計算。

用法：
  python3 route_planner.py candidates.json --day-hours 9 --speed transit

candidates.json 格式（陣列，每筆至少要有座標）：
[
  {"name": "清水寺", "座標": "34.9948,135.785", "建議停留": 60, "must_visit": true},
  {"name": "錦市場", "座標": "35.0051,135.765", "建議停留": 45}
]
座標缺漏或格式錯誤的點會被跳過，列在 warnings 裡，不會讓整個排程失敗。
"""
import json, sys, argparse, math

SPEED_KMH = {"walking": 4.2, "transit": 18, "driving": 32}


def haversine_km(a, b):
    R = 6371.0
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def parse_coord(s):
    try:
        lat_str, lng_str = str(s).split(",")
        return (float(lat_str.strip()), float(lng_str.strip()))
    except Exception:
        return None


def nearest_neighbor_order(points):
    if not points:
        return []
    remaining = points[:]
    route = [remaining.pop(0)]
    while remaining:
        last = route[-1]["coord"]
        remaining.sort(key=lambda p: haversine_km(last, p["coord"]))
        route.append(remaining.pop(0))
    return route


def split_into_days(ordered, day_minutes, speed_kmh, buffer_min_per_stop=10):
    days = []
    current_day = []
    current_minutes = 0
    prev_coord = None
    for p in ordered:
        travel_min = 0.0
        if prev_coord is not None:
            dist = haversine_km(prev_coord, p["coord"])
            travel_min = (dist / speed_kmh) * 60
        stop_cost = travel_min + p["duration_min"] + buffer_min_per_stop
        if current_day and current_minutes + stop_cost > day_minutes:
            days.append(current_day)
            current_day = []
            current_minutes = 0
            prev_coord = None
            travel_min = 0.0
            stop_cost = p["duration_min"] + buffer_min_per_stop
        current_day.append({**p, "travel_min_from_prev": round(travel_min)})
        current_minutes += stop_cost
        prev_coord = p["coord"]
    if current_day:
        days.append(current_day)
    return days


def main():
    ap = argparse.ArgumentParser(description="旅遊動線草案計算（最近鄰貪婪排序 + 每日時數分天）")
    ap.add_argument("input", help="候選點 JSON 檔案路徑，或用 - 從 stdin 讀")
    ap.add_argument("--day-hours", type=float, default=9.0, help="每天可安排的總時數（含交通與停留），預設 9")
    ap.add_argument("--speed", choices=SPEED_KMH.keys(), default="transit")
    args = ap.parse_args()

    raw = sys.stdin.read() if args.input == "-" else open(args.input, encoding="utf-8").read()
    items = json.loads(raw)

    points, skipped = [], []
    for it in items:
        coord = parse_coord(it.get("座標") or it.get("coord") or "")
        name = it.get("name") or it.get("條目名稱") or "(未命名)"
        if not coord:
            skipped.append(name)
            continue
        points.append({
            "name": name,
            "coord": coord,
            "duration_min": it.get("duration_min") or it.get("建議停留") or 60,
            "must_visit": it.get("must_visit", False),
        })

    ordered = nearest_neighbor_order(points)
    days = split_into_days(ordered, args.day_hours * 60, SPEED_KMH[args.speed])

    result = {
        "speed_assumption": f"{args.speed}（{SPEED_KMH[args.speed]} km/h 有效速度，含轉乘/找路耗時的粗估，不是實際導航時間）",
        "day_hours_budget": args.day_hours,
        "days": [
            {
                "day": i + 1,
                "stops": [
                    {
                        "順序": j + 1,
                        "名稱": s["name"],
                        "距上一站交通(分)": s["travel_min_from_prev"],
                        "建議停留(分)": s["duration_min"],
                        "必去": s["must_visit"],
                    }
                    for j, s in enumerate(day)
                ],
                "當日預估總時數(小時)": round(
                    sum(s["travel_min_from_prev"] + s["duration_min"] for s in day) / 60, 1
                ),
            }
            for i, day in enumerate(days)
        ],
        "warnings": (
            [f"以下項目沒有座標或格式錯誤，已跳過未排入動線：{', '.join(skipped)}"] if skipped else []
        ),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
