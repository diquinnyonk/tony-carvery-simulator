# Tony Carvery Simulator

An Overcooked-style browser game set in a British carvery. You are Tony: seat the guests, take their orders, carve their dinners, drown them in gravy, hand over the bill and bank the cash. Brew more gravy when the pot runs dry, hoover up the gravy everyone slops on the floor with the **Gravy Hoover 3000**, and rugby-tackle anyone who tries to do a runner.

## Play it

No install or build step. Serve the folder with any static web server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(`npm start` does the same.) Recording needs microphone access, which browsers only allow on `localhost` or over `https`, so it works locally and on GitHub Pages.

## Levels

| Level | Goal |
|---|---|
| Starter | Guided tutorial, no clock |
| 1 Sunday Lunch | Serve 2 guests in 1 minute |
| 2 Lunch Rush | Serve 4 guests in 1 minute |
| 3 Gravy Train | Serve 10 guests in 2 minutes |
| 4 Match Day Madness | Serve 20 guests in 2 minutes |

A guest counts as served once they've eaten and their cash is banked at the till. All tuning (spawn rates, party sizes, patience, eating time, runner and spill rates) lives in `src/game/levels.js` and `src/game/guestTypes.js`.

## Guests

Regulars, Posh (impatient, big tips), Rude (moan, tiny tips), Big Eaters (want double gravy, spill loads), Hooligans (messy, run in groups) and Chavs (most likely to do a runner, haggle at the bill), plus any custom guests you make.

## Controls

- **Move:** WASD or arrow keys
- **Action:** Space or E (hold to pour gravy or stir the pot)
- **Dash:** Shift or Q
- **Pause:** Esc or the pause button
- Phones and tablets get an on-screen joystick plus ACTION and DASH buttons.

## Recording Studio

- **Sounds:** record your own version of Tony's lines, every sound effect, and every guest type's lines (5 seconds max each). Anything you don't record uses the built-in synth sounds and browser speech.
- **Characters:** create guests with a name, behaviour type, skin, clothes, hair, hat, extras, size, an optional face photo and their own recorded voice lines. Ticked characters show up in Levels 1 to 4.

Recordings and characters are stored in IndexedDB in your browser, on that device only.

## Code layout

- `src/game/`: simulation (`game.js`), layout (`world.js`), levels, guest types, lines, tutorial script, canvas renderer
- `src/engine/`: loop, input, shared cartoon drawing
- `src/audio/`: synth effects, recordings and speech, microphone recorder
- `src/screens/`: title, how to play, level select and results, recording studio
- `src/storage/db.js`: IndexedDB and saved progress

## Tests

```sh
npm test
```

Runs the game logic tests with Node's built-in test runner (no dependencies), including a full play-through of the tutorial.
