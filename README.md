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


License
------------------------------------------------------------------------------

aeroscore is licensed under the [MIT License](LICENSE).
