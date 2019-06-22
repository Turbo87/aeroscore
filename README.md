aeroscore
==============================================================================

[![Build Status](https://travis-ci.org/Turbo87/aeroscore.svg?branch=master)](https://travis-ci.org/Turbo87/aeroscore)

Gliding Competition Scoring


Content
------------------------------------------------------------------------------

The current status of the project is: **work in progress**

This project contains code and algorithms to score gliding competition
flights using the [TypeScript](https://www.typescriptlang.org/) programming
language. The reason for using TypeScript is being able to compile to
JavaScript and run the code in the browser to ultimately allow live scoring
using either [SkyLines](https://skylines.aero) or
[OGN](http://wiki.glidernet.org/) live tracking data.

The `examples` folder contains some basic scripts to demonstrate what the
library is currently capable of. It is recommended to run them using
[ts-node](https://github.com/TypeStrong/ts-node). For example:

```bash
ts-node examples/calc-ranking.ts fixtures/2017-07-17-lev
```


Installation
------------------------------------------------------------------------------
To install aeroscore you need to install:

GIT and curl
```bash
sudo apt-get install git curl
```

Node.js
```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
```

Yarn
```bash
curl -o- -L https://yarnpkg.com/install.sh | bash
```

Logout (exit) and back in again

```bash
yarn global add ts-node typescript
```

aeroscore
```
git clone https://github.com/Turbo87/aeroscore.git
```

Change into aeroscore directory and install dependencies
```bash
cd aeroscore
yarn install
```

To check if you installation was successful, run

```bash
ts-node examples/live-scoring.ts
```

Live-Scoring
------------------------------------------------------------------------------
You can use aeroscore to perform a live scoring of a running contest task. aeroscore can read a given task (XCSoar tsk format) and filter (Glidertracker.org fromat) to perform live scoring of the task.
aeroscore connects to Glidertracker.org via WebSocket connection and continuously receives OGN data from the GliderTracker, which it evaluates into a live scoring.

Live-scoring using local filter and task files can be started like this
```bash
ts-node examples/live-scoring.ts fixtures/Bayreuth/2018-05-30/Open/task.tsk fixtures/Bayreuth/2018-05-30/Open/filter.csv
```

Live-scoring using remote filter and task files directly from GliderTracker.org can be started like this
```bash
ts-node examples/live-scoring.ts "http://glidertracker.org/#tsk=https://gist.github.com/hsteinhaus/4369987643f0081d49c4458baa8c1422/raw/task&lst=https://gist.github.com/hsteinhaus/4369987643f0081d49c4458baa8c1422/raw/filter"
```

Usage
------------------------------------------------------------------------------

## Single flights

- Show the detected task points on a map
  ```bash
   ts-node examples/task-point-tracker.ts TASK_PATH IGC_PATH
    ```

- Show a map with the flight path, task and all detected area intersections.
  ```bash
  ts-node examples/show-area-intersections.ts TASK_PATH IGC_PATH
  ```

- Show a map with the flight path and task.
  ```bash
  ts-node examples/show-flights.ts TASK_PATH IGC_PATH
  ```

- Print the detected task points and times as well as the final speed and distance
  ```bash
  ts-node examples/analyze-flight.ts TASK_PATH IGC_PATH
  ```

- Show a map with the flight path, task and the optimized AAT path
  ```bash
  ts-node examples/show-aat-path.ts TASK_PATH IGC_PATH
  ```

- Show the given task on a map
  ```bash
  ts-node examples/show-task.ts TASK_PATH
    ```

## Scoring a competition

- Calculate the ranking for a given competition day.
  Expected folder structure:
  - `./task.tsk` - task in xcsoar task format
  - `./filter.csv` - list of pilots, glider types, handicap, etc.
  - `./[A-Z]{1,3}_.*.igc` - The flight logs, name prefixed with the CN

  ```bash
  ts-node examples/calc-ranking.ts FOLDER
  ```

- Print the list of start and landing times for a given competition day.
  ```bash
  ts-node examples/calc-flight-times.ts FOLDER
  ```

## Live tracking and scoring

- Calculate the live scoring for the given task and pilot/glider list using GliderTracker.
  ```bash
  ts-node examples/live-scoring.ts TASK_PATH CSV_PATH
  ```


- Show the OGN traffic for a given competition
  ```bash
  ts-node examples/show-ogn-traffic.ts CSV_PATH
  ```

- Show track for a given ID
  ```bash
  ts-node examples/glidertracker-history.ts FLARM_ID [YYYY-MM-DD]
  ```

License
------------------------------------------------------------------------------

aeroscore is licensed under the [MIT License](LICENSE).
