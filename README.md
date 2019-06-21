# City Explorer Back End
back end for city explorer app

**Authors**: Jagdeep Singh, Trey Herndon, Bonnie Wang, Jesse Van Volkinburg

**Version**: 1.0.0

## Overview

This site is being built so that we can get hands on experience with backend systems and produce a product that pulls from multiple databases and updates the information pulled regularly.

## Getting Started

1. Copy base code from our Repo: `git clone https://github.com/jcwang118/lab-09-back-end.git`.
2. Enter into directory `cd lab-09-back-end`.
3. Checkout to the jesse-dev branch: `git checkout jesse-dev`.
4. Ensure npm packages are installed: `npm i`
5. Create `.env` file containing environment variables, using your appropriate API keys and database connection URL: 

```
PORT=3000
DATABASE_URL=postres://localhost:5432/city_explorer
DARK_SKY_API_KEY=
YELP_API_KEY=
GOOGLE_MAPS_API_KEY=
MOVIE_DB_API_KEY=
MEETUP_API_KEY=
HIKING_API_KEY=
```

6. Create a `city_explorer` database, then create tables:
`psql -f data/schema.sql -d city_explorer`
7. Run `nodemon`
8. Deploy if desired.




## Architecture

Langauges currently in use include, JavaScript, node, JSON, npm.
NPM packages in use: express, cors, dotenv, superagent, pg



## Change Log

2019-03-19 - Application now has a fully-functional express server, with a GET route for the /location resource.
2019-03-20 - Application has a /weather GET route and a /meetups GET route, and an error handler.
2019-03-21 - Application saves to PostgreSQL database, 


## Credits and Collaborations

Collaborators: Trey Herndon, Jesse Van Volkinburg, Bonnie Wang, Jagdeep Singh

Credit should be given to CodeFellows for providing all of the frontend javascript, html, and CSS. CodeFellows also gave guidance on the creation of the backend portion.




