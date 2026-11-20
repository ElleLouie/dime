# Dime

A basketball film-room game. Real Warriors possessions play out, freeze the moment the ball handler has to pass, and you make the read. Yellow shows open space and open passing lanes; the best read earns three stars.

## How it works

- **Real tracking data:** every play comes from the NBA's 2015–16 SportVU player tracking (positions of all ten players and the ball, 25 times a second), matched to the play-by-play.
- **Scoring a read:** each teammate is scored by the shot he'd get: the shot's value, how often that shot goes in (league averages inside the arc, the player's own three-point percentage), how open he is, and whether a defender is in the passing lane.
- **Sessions:** five plays where the real pass was clearly the best option. Session 1 is the Warriors against Cleveland on Christmas Day 2015.

## Running locally

```bash
npm install
npm run dev
```

- `npm run build` builds the game into `dist/`
- `npm test` runs the tests for the game's wording and the scoring pipeline

## Building a session

```bash
python3 scripts/build_session.py <game.json> <events.csv> public/sessions/<name>.json 5
```

The raw tracking files (about 100 MB per game) aren't kept in this repository. They come from [linouk23/NBA-Player-Movements](https://github.com/linouk23/NBA-Player-Movements) and the play-by-play from [sealneaward/nba-movement-data](https://github.com/sealneaward/nba-movement-data).

## Credits

Player tracking from the NBA's 2015–16 SportVU data, shared publicly for research. Three-point percentages from Basketball Reference. Not affiliated with the NBA or the Golden State Warriors. Built with three.js and Vite; type is Barlow Condensed.
