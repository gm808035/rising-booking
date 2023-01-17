# toca-booking-api

| Branch  | Build status                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| master  | [![Build status](https://github.com/toca-football/toca-booking-api/actions/workflows/build.yml/badge.svg?branch=master)][ci-master]   |
| develop | [![Build status](https://github.com/toca-football/toca-booking-api/actions/workflows/build.yml/badge.svg?branch=develop)][ci-develop] |

## Prerequisites

To use this repo you will need the following downloads:

1. [git >=2.13.0][git]
1. [nvm][nvm] to install, run `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash` to install.
1. [Node.js v14.16.1][nodejs]: If you have `nvm` installed you can run `nvm install 14` to install (this is recommended).
1. [Docker >= 20.10.6][docker]: To run locally
1. [docker-compose >= 1.29.1][dockercompose]: To run locally

## Running locally

```bash
# install dependencies
$ npm i

# start docker compose start
$ docker compose up
# api will be ready at http://localhost:3000

# tests should be run while docker compose is running
$ npm test -- --runInBand
```

## Error codes

### Create/update booking

| Code | Error               | Description                                              |
| ---- | ------------------- | -------------------------------------------------------- |
| 000  | Invalid payload     | Fields that are required are missing                     |
| 001  | Unknown venue id    |                                                          |
| 002  | Unknown box id      |                                                          |
| 003  | Unknown box slot id |                                                          |
| 004  | Wrong box slot      | Booking start time is not the same as BoxSlot start time |
| 005  | Slot unavailable    | There is already a booking for the same time             |
| 010  | Unknown price point |                                                          |

### Get booking

| Code | Error             | Description                                           |
| ---- | ----------------- | ----------------------------------------------------- |
| 006  | Booking not found | Booking reference and sessionId combination not found |

### Create/update booking reception endpoint

| Code | Error           | Description                                       |
| ---- | --------------- | ------------------------------------------------- |
| 007  | Invalid payload | Invalid fields submitted to create/update booking |

### Update peak times endpoint

| Code | Error                    | Description                                  |
| ---- | ------------------------ | -------------------------------------------- |
| 007  | Invalid payload          | Invalid fields submitted to update peak time |
| 009  | Unknown venue id         |                                              |
| 012  | Peak time already exists |                                              |

### CRUD box slot endpoint

| Code | Error                                                  | Description                                               |
| ---- | ------------------------------------------------------ | --------------------------------------------------------- |
| 016  | unknown box slot                                       |                                                           |
| 017  | unknown box                                            |                                                           |
| 018  | unknown linked box slot                                | Invalid fields submitted to create/update box slot linked |
| 019  | Invalid payload                                        | Fields that are required are missing or wrong             |
| 020  | unknown venue                                          |                                                           |
| 029  | linked slots must be deleted together                  |                                                           |
| 030  | box slot id's need to be passed in an array format     |                                                           |
| 031  | box slot link ids need to be passed in an array format |                                                           |
| 032  | error deleting box slot links                          |                                                           |
| 033  | conflicted box slot                                    |                                                           |

### CRUD schedule endpoint

| Code | Error                        | Description        |
| ---- | ---------------------------- | ------------------ |
| 018  | unknown venue                |                    |
| 019  | validation errors            | invalid input      |
| 020  | not found                    | resource not found |
| 021  | unknown schedule             |                    |
| 023  | unknown venue schedule       |                    |
| 024  | invalid parameter            |                    |
| 025  | schedule name already exists |                    |
| 026  | recurrence already exists    |                    |
| 027  | unknown open time            |                    |
| 028  | unknown peak time            |                    |

## Architecture

The stack consists of an API Gateway that provide a few endpoints connected to Lambda functions which will use a RDS MySQL cluster to store and manage bookings information

[Confluence docs](https://tocasocial.atlassian.net/wiki/spaces/~674978906/pages/1314226177/Booking+API+MVP+scope)

[Postman collection](https://tocasocial.postman.co/workspace/TOCA-Booking-API---Workspace~8a345afd-350f-45aa-84eb-d58d37639ff1/api/c3cbca51-b6a4-43cf-aff3-01ebaaf28fb1?version=519e92b2-ba22-4b33-9a23-4649c8e0c805&tab=overview)

### Components

![architectural diagram](./docs/architecture.png?raw)

### Sequence

![sequence diagram](./docs/sequence.png?raw)

### Data Model

![data model](./docs/data-model.png?raw)

[git]: https://git-scm.com
[nvm]: https://github.com/creationix/nvm#installation-and-update
[nodejs]: https://nodejs.org/
[docker]: https://docs.docker.com/get-docker/
[dockercompose]: https://docs.docker.com/compose/install/
[ci-master]: https://github.com/toca-football/toca-booking-api/actions/workflows/build.yml?query=branch%3Amaster
[ci-develop]: https://github.com/toca-football/toca-booking-api/actions/workflows/build.yml?query=branch%3Adevelop
