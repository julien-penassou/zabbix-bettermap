-- Better Maps : tables de stockage des cartes et des icônes personnalisées.
-- Le module les crée tout seul au premier accès.
-- Ce script ne sert que si l'utilisateur SQL du frontend n'a pas le droit CREATE.

-- PostgreSQL / TimescaleDB
CREATE TABLE bettermaps_map (
	mapid   varchar(32)  NOT NULL,
	name    varchar(255) NOT NULL DEFAULT '',
	data    text         NOT NULL,
	updated integer      NOT NULL DEFAULT 0,
	PRIMARY KEY (mapid)
);

CREATE TABLE bettermaps_icon (
	iconid  varchar(32)  NOT NULL,
	name    varchar(255) NOT NULL DEFAULT '',
	mime    varchar(64)  NOT NULL DEFAULT '',
	data    text         NOT NULL,
	updated integer      NOT NULL DEFAULT 0,
	PRIMARY KEY (iconid)
);

-- MySQL / MariaDB (utiliser plutôt celles-ci)
-- CREATE TABLE bettermaps_map (
-- 	mapid   varchar(32)  NOT NULL,
-- 	name    varchar(255) NOT NULL DEFAULT '',
-- 	data    longtext     NOT NULL,
-- 	updated integer      NOT NULL DEFAULT 0,
-- 	PRIMARY KEY (mapid)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE bettermaps_icon (
-- 	iconid  varchar(32)  NOT NULL,
-- 	name    varchar(255) NOT NULL DEFAULT '',
-- 	mime    varchar(64)  NOT NULL DEFAULT '',
-- 	data    longtext     NOT NULL,
-- 	updated integer      NOT NULL DEFAULT 0,
-- 	PRIMARY KEY (iconid)
-- ) ENGINE=InnoDB;
