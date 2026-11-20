"""Builds a film session: real Warriors possessions cut at the moment of the pass, with every option scored.

    python3 scripts/build_session.py <game.json> <events.csv> <out.json> [count]

<game.json> is a SportVU tracking file (2015-16, 25 frames a second) and <events.csv> its play-by-play.
The output holds, for each play, the frames to animate and the passer's options at the decision.
"""
import csv
import json
import math
import sys

TEAM = 'GSW'
HOOP_FT = 5.25  # the hoop's distance from the baseline
NICK = {'Stephen Curry': 'Steph', 'Klay Thompson': 'Klay', 'Draymond Green': 'Draymond', 'Andre Iguodala': 'Iggy'}


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


# three-point percentage, 2015-16 (from basketball-reference); anyone missing rarely shot threes
THREES = {
    'Stephen Curry': 0.454, 'Klay Thompson': 0.425, 'Draymond Green': 0.388, 'Brandon Rush': 0.414,
    'Andre Iguodala': 0.351, 'Leandro Barbosa': 0.355, 'Marreese Speights': 0.387, 'Ian Clark': 0.369,
    'Harrison Barnes': 0.383, 'Shaun Livingston': 0.0, 'Andrew Bogut': 0.0, 'Festus Ezeli': 0.0,
}


def make_rate(feet, value, full_name):
    """Roughly how often this shot goes in: league averages inside the arc, the player's own rate from three."""
    if value == 3:
        rate = THREES.get(full_name, 0.1) or 0.1
        return max(0.05, rate - max(0, feet - 26) * 0.03)  # deep threes are harder
    if feet < 4:
        return 0.62
    return 0.40


def shot_value(feet, x_from_baseline, y):
    # corner threes are 22 ft, the rest of the arc 23.75 ft
    corner = x_from_baseline < 14 and (y < 3 or y > 47)
    return 3 if feet >= (22 if corner else 23.75) - 0.5 else 2


def score_option(spot, hoop, defenders, passer_at, full_name):
    """Expected points if this player gets the ball here: the shot's value, how often it goes in, how open he is,
    and whether a defender is in the passing lane."""
    feet = dist(spot, hoop)
    space = min(dist(spot, d) for d in defenders)
    x_from_baseline = abs(spot[0] - (hoop[0] - HOOP_FT if hoop[0] < 47 else hoop[0] + HOOP_FT))
    value = shot_value(feet, x_from_baseline, spot[1])
    openness = min(1.0, 0.45 + space / 24)  # more space keeps helping, up to about 13 ft
    lane_blocked = any(_near_lane(passer_at, spot, d) for d in defenders)
    points = value * make_rate(feet, value, full_name) * openness * (0.6 if lane_blocked else 1.0)
    rate = make_rate(feet, value, full_name)
    return {'feet': round(feet, 1), 'space': round(space, 1), 'value': value, 'rate': round(rate, 3), 'blocked': lane_blocked, 'points': round(points, 3)}


def _near_lane(a, b, p, width=3.0):
    """A defender within `width` ft of the pass's path, away from either end."""
    ab = (b[0] - a[0], b[1] - a[1])
    length = ab[0] ** 2 + ab[1] ** 2
    if length == 0:
        return False
    t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / length
    if t < 0.12 or t > 0.92:
        return False
    return dist(p, (a[0] + ab[0] * t, a[1] + ab[1] * t)) < width


def frames_of(event):
    frames = []
    for m in event['moments']:
        ball = next((o for o in m[5] if o[1] == -1), None)
        people = [o for o in m[5] if o[1] != -1]
        if ball is None or len(people) != 10:
            continue
        frames.append({'ball': [round(ball[2], 1), round(ball[3], 1), round(ball[4], 1)],
                       'players': [[o[1], round(o[2], 1), round(o[3], 1)] for o in people]})
    return frames


def build_play(event, row, players):
    passer, shooter = int(row['PLAYER2_ID']), int(row['PLAYER1_ID'])
    frames = frames_of(event)
    if len(frames) < 60:
        return None
    # the decision: the last frame the passer has the ball before it leaves his hands
    holding = [i for i, f in enumerate(frames)
               if any(p[0] == passer and dist(p[1:], f['ball']) < 3 for p in f['players']) and f['ball'][2] < 9]
    if not holding:
        return None
    d = holding[-1]
    shot = max(range(d, len(frames)), key=lambda i: frames[i]['ball'][2])
    right = frames[d]['ball'][0] > 47
    depth = (lambda x: 94 - x) if right else (lambda x: x)
    # everyone has to fit on the half court at the decision
    if max(depth(p[1]) for p in frames[d]['players']) > 52:
        return None
    start = d
    while start > max(0, d - 100) and max(depth(p[1]) for p in frames[start - 1]['players']) < 58:
        start -= 1
    if d - start < 20:
        return None
    end = min(len(frames) - 1, shot + 30)

    f = frames[d]
    team = lambda pid: players[pid]['team']
    hoop = (88.75 if right else 5.25, 25)
    defenders = [p[1:] for p in f['players'] if team(p[0]) != TEAM]
    passer_at = next(p[1:] for p in f['players'] if p[0] == passer)
    options = {}
    for pid, x, y in f['players']:
        if team(pid) == TEAM and pid != passer:
            options[pid] = score_option((x, y), hoop, defenders, passer_at, players[pid]['full'])
    ranked = sorted(options, key=lambda pid: -options[pid]['points'])
    for k, pid in enumerate(ranked):
        options[pid]['stars'] = 3 if k == 0 else 2 if k == 1 else 1
    near = sum(1 for dx, dy in defenders if dist((dx, dy), passer_at) < 6)

    keep = frames[start:end + 1]
    on_court = {p[0] for fr in keep for p in fr['players']}
    return {
        'id': int(row['EVENTNUM']),
        'clock': f"Q{row['PERIOD']} {row['PCTIMESTRING']}",
        'play': row['HOMEDESCRIPTION'],
        'passer': passer, 'shooter': shooter,
        'doubled': near >= 2,
        'right': right, 'decision': d - start, 'end': end - start,
        'players': {str(pid): players[pid] for pid in on_court},
        'options': {str(pid): o for pid, o in options.items()},
        'frames': keep,
    }


def main():
    game_path, events_path, out_path = sys.argv[1:4]
    count = int(sys.argv[4]) if len(sys.argv) > 4 else 5
    game = json.load(open(game_path))
    rows = {int(r['EVENTNUM']): r for r in csv.DictReader(open(events_path))}
    events = {int(e['eventId']): e for e in game['events']}

    plays = []
    for num, row in sorted(rows.items()):
        # Warriors baskets that came off a pass
        if row['EVENTMSGTYPE'] != '1' or row['PLAYER1_TEAM_ABBREVIATION'] != TEAM or not row['PLAYER2_ID'] or row['PLAYER2_ID'] == '0':
            continue
        event = events.get(num)
        if not event or not event['moments']:
            continue
        players = {}
        for side in ('home', 'visitor'):
            for p in event[side]['players']:
                full = f"{p['firstname']} {p['lastname']}"
                players[p['playerid']] = {'name': NICK.get(full, p['lastname']), 'full': full, 'jersey': p['jersey'], 'team': event[side]['abbreviation']}
        play = build_play(event, row, players)
        # keep the clear lessons: the real pass went to the best option, and it was clearly the best
        if play and play['options'].get(str(play['shooter']), {}).get('stars') == 3:
            best, second = sorted((o['points'] for o in play['options'].values()), reverse=True)[:2]
            if best >= second * 1.15:
                plays.append(play)

    # spread them out: different passers where possible, in game order
    chosen, passers = [], set()
    for p in plays:
        if p['passer'] not in passers and len(chosen) < count:
            chosen.append(p)
            passers.add(p['passer'])
    for p in plays:
        if p not in chosen and len(chosen) < count:
            chosen.append(p)
    chosen.sort(key=lambda p: p['id'])

    session = {
        'title': 'Christmas vs Cleveland',
        'game': f"CLE at GSW · {game['gamedate']}",
        'plays': chosen,
    }
    json.dump(session, open(out_path, 'w'), separators=(',', ':'))
    print(f'{len(plays)} clear reads found, kept {len(chosen)}')
    for p in chosen:
        print(' ', p['id'], p['clock'], p['play'], '| doubled' if p['doubled'] else '')


if __name__ == '__main__':
    main()
