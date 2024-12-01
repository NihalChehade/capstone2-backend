\echo 'Delete and recreate home-automation db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS "home-automation";
CREATE DATABASE "home-automation";
\connect home-automation

\i home-automation-schema.sql

\echo 'Delete and recreate home-automation_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS "home-automation-test";
CREATE DATABASE "home-automation-test";
\connect home-automation-test

\i home-automation-schema.sql
