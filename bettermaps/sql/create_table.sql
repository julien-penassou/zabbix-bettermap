-- Better Maps : table de stockage des cartes.
-- Le module la crée tout seul au premier affichage de "Surveillance > Cartes+".
-- Ce script ne sert que si l'utilisateur SQL du frontend n'a pas le droit CREATE.

-- PostgreSQL / TimescaleDB
CREATE TABLE bettermaps_map (
	mapid   varchar(32)  NOT NULL,
	name    varchar(255) NOT NULL DEFAULT '',
	data    text         NOT NULL,
	updated integer      NOT NULL DEFAULT 0,
	PRIMARY KEY (mapid)
);

-- MySQL / MariaDB (utiliser plutôt celle-ci)
-- CREATE TABLE bettermaps_map (
-- 	mapid   varchar(32)  NOT NULL,
-- 	name    varchar(255) NOT NULL DEFAULT '',
-- 	data    longtext     NOT NULL,
-- 	updated integer      NOT NULL DEFAULT 0,
-- 	PRIMARY KEY (mapid)
-- ) ENGINE=InnoDB;
