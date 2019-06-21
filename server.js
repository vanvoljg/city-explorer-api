'use strict';

// SERVER CONFIGURATION
require('dotenv').config();

const superagent = require('superagent');
const express = require('express');
const pg = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT;

// Create client connection to DB
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', error => console.error(error));

// API ROUTES
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/meetups', getMeetups);
app.get('/movies', getMovies);
app.get('/yelp', getYelps);
app.get('/trails', getTrails);

// '*' route for invalid endpoints
app.use('*', (req, res) => res.send('Sorry, that route does not exist'));

// Open port for server to listen on
app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));

// HELPER FUNCTIONS

const timeouts = {
  weather: 1000 * 15, // 15 seconds
  yelp: 1000 * 60 * 60 * 24 * 7, // 7 days
  meetup: 1000 * 60 * 60 * 6, // 6 hours
  movie: 1000 * 60 * 60 * 24 * 30, // 30 days
  trail: 1000 * 60 * 60 * 6 // 6 hours
};

function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}

function insertData(sqlInfo, sqlData) {
  let values = Object.values(sqlData);
  console.log(`insert ${sqlInfo.endpoint} data into sql`);
  let sql = `INSERT INTO ${sqlInfo.endpoint}s(${Object.keys(sqlData)}) VALUES(${values.map((a, idx) => `$${idx + 1}`)}) RETURNING id;`;
  try {
    return client.query(sql, values);
  } catch (error) {
    handleError(error);
  }
}

function getData(sqlInfo) {
  console.log(`get ${sqlInfo.endpoint} data from sql`);
  let values = [sqlInfo.id];
  let sql = `SELECT * FROM ${sqlInfo.endpoint}s WHERE location_id=$1;`;
  try {
    return client.query(sql, values);
  } catch (error) {
    handleError(error);
  }
}

function deleteData(sqlInfo) {
  console.log(`delete ${sqlInfo.endpoint} data from sql`);
  let values = [sqlInfo.id];
  let sql = `DELETE FROM ${sqlInfo.endpoint}s WHERE location_id=$1;`;
  try {
    return client.query(sql, values);
  } catch (error) {
    handleError(error);
  }
}

function checkSqlData(sqlInfo, sqlData) {
  if (sqlData.rowCount > 0) {
    if (Date.now() - sqlData.rows[0].created_at > timeouts[sqlInfo.endpoint]) {
      deleteData(sqlInfo);
      return false;
    } else {
      return sqlData;
    }
  }
  return false;
}

function getLocation(req, res) {
  let sqlInfo = {
    query: req.query.data,
    endpoint: 'location'
  };

  let sql = `SELECT * FROM locations WHERE search_query=$1;`;
  let values = [sqlInfo.query];

  client
    .query(sql, values)
    .then(result => {
      if (result.rowCount > 0) {
        console.log('LOCATION FROM SQL');
        res.send(result.rows[0]);
      } else {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${process.env.GOOGLE_MAPS_API_KEY}&address=${req.query.data}`;
        superagent
          .get(url)
          .then(data => {
            console.log('LOCATION FROM API');

            if (!data.body.results.length) throw 'NO LOCATION DATA';
            else {
              let location = new Location(sqlInfo.query, data.body.results[0]);
              insertData(sqlInfo, location)
                .then(result => {
                  location.id = result.rows[0].id;
                  res.send(location);
                })
                .catch(error => handleError(error));
            }
          })
          .catch(error => handleError(error, res));
      }
    })
    .catch(error => handleError(error, res));
}

function getWeather(req, res) {
  const sqlInfo = {
    id: req.query.data.id,
    endpoint: 'weather'
  };

  getData(sqlInfo)
    .then(data => {
      if (checkSqlData(sqlInfo, data)) res.send(data.rows);
      else {
        const url = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API_KEY}/${req.query.data.latitude},${req.query.data.longitude}`;
        superagent
          .get(url)
          .then(weatherResults => {
            if (!weatherResults.body.daily.data.length) throw 'NO WEATHER API DATA';
            else {
              const weatherArray = weatherResults.body.daily.data.map(day => {
                let weather = new Forecast(day);
                weather.location_id = sqlInfo.id;
                insertData(sqlInfo, weather).catch(error => handleError(error));
                return weather;
              });
              res.send(weatherArray);
            }
          })
          .catch(error => handleError(error, res));
      }
    })
    .catch(error => handleError(error));
}

function getMeetups(req, res) {
  const sqlInfo = {
    id: req.query.data.id,
    endpoint: 'meetup'
  };

  getData(sqlInfo)
    .then(data => {
      if (checkSqlData(sqlInfo, data)) res.send(data.rows);
      else {
        const url = `https://api.meetup.com/find/upcoming_events?lat=${req.query.data.latitude}&lon=${req.query.data.longitude}&sign=true&key=${
          process.env.MEETUP_API_KEY
        }&page=20`;

        superagent
          .get(url)
          .then(meetupResults => {
            console.log('Meetups from API');
            if (!meetupResults.body.events.length) throw 'NO MEETUP API DATA';
            else {
              const meetupArray = meetupResults.body.events.map(event => {
                let meetup = new MeetupEvent(event);
                meetup.location_id = sqlInfo.id;
                insertData(sqlInfo, meetup).catch(error => handleError(error));
                return meetup;
              });

              res.send(meetupArray);
            }
          })
          .catch(error => handleError(error));
      }
    })
    .catch(error => handleError(error));
}

function getMovies(req, res) {
  const sqlInfo = {
    id: req.query.data.id,
    endpoint: 'movie'
  };

  getData(sqlInfo)
    .then(data => {
      if (checkSqlData(sqlInfo, data)) res.send(data.rows);
      else {
        const configUrl = `https://api.themoviedb.org/3/configuration?api_key=${process.env.MOVIE_DB_API_KEY}`;
        let imgUrlBase;
        superagent
          .get(configUrl)
          .then(configResult => {
            if (!configResult.body.images) throw 'NO MOVIEDB CONFIG DATA'
            else imgUrlBase = configResult.body.images.secure_base_url + configResult.body.images.poster_sizes[3];

            const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_DB_API_KEY}&language=en-US&query=${req.query.data.search_query}`;
            superagent
              .get(url)
              .then(movieResults => {
                console.log('Movies from API');
                if (!movieResults.body.results.length) throw 'NO MOVIEDB MOVIE DATA';
                else {
                  let movieArray = movieResults.body.results.map(movieResult => {
                    let movie = new Movie(movieResult, imgUrlBase);
                    movie.location_id = sqlInfo.id;
                    insertData(sqlInfo, movie);
                    return movie;
                  });
                  res.send(movieArray);
                }
              })
              .catch(error => handleError(error, res));
          })
          .catch(error => handleError(error, res));
      }
    })
    .catch(error => handleError(error));
}

function getYelps(req, res) {
  const sqlInfo = {
    id: req.query.data.id,
    endpoint: 'yelp'
  };

  getData(sqlInfo)
    .then(data => {
      if (checkSqlData(sqlInfo, data)) res.send(data.rows);
      else {
        const url = `https://api.yelp.com/v3/businesses/search?latitude=${req.query.data.latitude}&longitude=${req.query.data.longitude}`;
        superagent
          .get(url)
          .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
          .then(yelpResults => {
            console.log('Yelp data from API');
            if (!yelpResults.body.businesses.length) throw 'NO YELP DATA';
            else {
              const yelpArray = yelpResults.body.businesses.map(business => {
                let yelp = new Yelp(business);
                yelp.location_id = sqlInfo.id;
                insertData(sqlInfo, yelp);
                return yelp;
              });
              res.send(yelpArray);
            }
          })
          .catch(error => handleError(error, res));
      }
    })
    .catch(error => handleError(error));
}

function getTrails(req, res) {
  const sqlInfo = {
    id: req.query.data.id,
    endpoint: 'trail'
  };

  getData(sqlInfo)
    .then(data => {
      if (checkSqlData(sqlInfo, data)) res.send(data.rows);
      else {
        const url = `https://www.hikingproject.com/data/get-trails?lat=${req.query.data.latitude}&lon=${req.query.data.longitude}&key=${process.env.HIKING_API_KEY}&maxResults=20`;
        superagent.get(url)
          .then(trailsResults => {
            if (!trailsResults.body.trails.length) throw 'NO TRAILS DATA';
            else {
              const trailsArray = trailsResults.body.trails.map(trailResult => {
                let trail = new Trail(trailResult);
                trail.location_id = sqlInfo.id;
                insertData(sqlInfo, trail);
                return trail;
              });
              res.send(trailsArray);
            }
          })
          .catch(error => handleError(error, res));
      }
    })
    .catch(error => handleError(error));
}

// Location object constructor
function Location(query, data) {
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

// Forecast object constructor
function Forecast(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.created_at = Date.now();
}

// Meetup event object constructor
function MeetupEvent(event) {
  this.link = event.link;
  this.name = event.name;
  this.creation_date = new Date(event.time).toString().slice(0, 15);
  this.host = event.group.name;
  this.created_at = Date.now();
}

function Yelp(business) {
  this.url = business.url;
  this.name = business.name;
  this.rating = business.rating;
  this.price = business.price;
  this.image_url = business.image_url;
  this.created_at = Date.now();
}

function Movie(movieResult, imgUrlBase) {
  this.title = movieResult.title;
  this.released_on = movieResult.release_date;
  this.total_votes = movieResult.vote_count;
  this.average_votes = movieResult.vote_average;
  this.popularity = movieResult.popularity;
  this.image_url = imgUrlBase + movieResult.poster_path;
  this.overview = movieResult.overview;
  this.created_at = Date.now();
}

function Trail(trailData) {
  this.trail_url = trailData.url;
  this.name = trailData.name;
  this.location = trailData.location;
  this.length = trailData.length;
  this.condition_time = trailData.conditionDate.slice(0, 10);
  this.condition_time = trailData.conditionDate.slice(11);
  this.conditions = trailData.conditionStatus;
  this.stars = trailData.stars;
  this.star_votes = trailData.starVotes;
  this.summary = trailData.summary;
  this.created_at = Date.now();
}
