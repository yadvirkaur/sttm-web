/* eslint-disable no-console */
import compression from 'compression';
require("dotenv").config();
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { hostname as _hostname } from 'os';
import createTemplate from './template';
import seo from '../common/seo';
import { DARK_MODE_COOKIE, DARK_MODE_CLASS_NAME, LANGUAGE_COOKIE, DEFAULT_LANGUAGE } from '../common/constants';
import { getMetadataFromRequest, createMetadataFromResponse } from './utils/';
import { authJwt, ssoDemo } from './config/routes';

const passport = require("./config/passport-auth");

const hostname = _hostname().substr(0, 3);
let port = process.env.NODE_ENV === 'development' ? '8081' : '8080';
const ON_HEROKU = 'ON_HEROKU' in process.env;

port = ON_HEROKU ? process.env.PORT : port;

const app = express();

// Define routes here
//require("./config/routes")(app);

app
  // Add body parser
  .use(bodyParser.json())

  // Compress files
  .use(compression())

  // Add cookie parser
  .use(cookieParser())

  // Infrastructure display
  .use((req, res, next) => {
    res.setHeader('origin-server', hostname);
    return next();
  })

  // Passport middleware
  .use(passport.initialize())

  // Use client for static files
  .use(express.static(`${__dirname}/../public`))

  // sso routes
  .get('/login/demo', ssoDemo)
  .post('/auth/jwt', authJwt)

  // Direct all calls to index template
  .get('*', async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const language = req.cookies[LANGUAGE_COOKIE] || DEFAULT_LANGUAGE;

    const { path, url } = req;

    const { createTitle, createDescription } = seo[
      seo[path] === undefined ? '/' : path
    ];

    // get the title/description from API call if needed.
    const bodyClass =
      DARK_MODE_COOKIE in req.cookies &&
        parseInt(req.cookies[DARK_MODE_COOKIE], 10) === 1
        ? DARK_MODE_CLASS_NAME
        : '';

    let metaData;
    try {
      const data = await getMetadataFromRequest(req);
      metaData = createMetadataFromResponse(req, data);

    } catch (err) {
      console.error('err.message', err.message);
    } finally {
      const title = createTitle(metaData && metaData.title);
      const description = createDescription(metaData && metaData.description);

      const template = createTemplate({
        url,
        bodyClass,
        title,
        description,
        language,
      });

      template(res, { debug: 'off', stringToBufferThreshold: 1000 });
    }
  })


  // Listen on port
  .listen(port, () => console.log(`Server started on port:${port}`));

//require("./config/routes")(app);