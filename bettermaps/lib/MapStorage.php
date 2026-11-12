<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

/**
 * Stockage des cartes dans une table dédiée (bettermaps_map) de la base Zabbix.
 * La table est créée automatiquement au premier accès.
 */
class MapStorage {

	public const TABLE = 'bettermaps_map';

	private static bool $ready = false;

	public static function ensureTable(): void {
		global $DB;

		if (self::$ready) {
			return;
		}

		$is_mysql = $DB['TYPE'] === ZBX_DB_MYSQL;

		$schema_cond = $is_mysql ? 'table_schema=DATABASE()' : 'table_schema=current_schema()';
		$exists = DBfetch(DBselect(
			'SELECT table_name FROM information_schema.tables'.
			' WHERE '.$schema_cond.' AND table_name='.zbx_dbstr(self::TABLE)
		));

		if (!$exists) {
			$sql = $is_mysql
				? 'CREATE TABLE '.self::TABLE.' ('.
					'mapid varchar(32) NOT NULL,'.
					'name varchar(255) NOT NULL DEFAULT \'\','.
					'data longtext NOT NULL,'.
					'updated integer NOT NULL DEFAULT 0,'.
					'PRIMARY KEY (mapid)'.
				') ENGINE=InnoDB'
				: 'CREATE TABLE '.self::TABLE.' ('.
					'mapid varchar(32) NOT NULL,'.
					'name varchar(255) NOT NULL DEFAULT \'\','.
					'data text NOT NULL,'.
					'updated integer NOT NULL DEFAULT 0,'.
					'PRIMARY KEY (mapid)'.
				')';

			if (!DBexecute($sql)) {
				throw new \RuntimeException(Lang::t('Unable to create table {table}. Create it manually with the script in the '.
					'module\'s sql/ folder.', ['table' => self::TABLE])
				);
			}
		}

		self::$ready = true;
	}

	public static function getList(): array {
		self::ensureTable();

		$maps = [];
		$result = DBselect('SELECT mapid,name,updated FROM '.self::TABLE.' ORDER BY name');

		while ($row = DBfetch($result)) {
			$maps[] = $row;
		}

		return $maps;
	}

	public static function get(string $mapid): ?array {
		self::ensureTable();

		$row = DBfetch(DBselect(
			'SELECT mapid,name,data,updated FROM '.self::TABLE.' WHERE mapid='.zbx_dbstr($mapid)
		));

		return $row ?: null;
	}

	public static function create(string $name): string {
		self::ensureTable();

		$mapid = bin2hex(random_bytes(8));
		$data = json_encode(['nodes' => [], 'links' => [], 'settings' => new \stdClass()]);

		DBexecute(
			'INSERT INTO '.self::TABLE.' (mapid,name,data,updated) VALUES ('.
				zbx_dbstr($mapid).','.zbx_dbstr($name).','.zbx_dbstr($data).','.time().
			')'
		);

		return $mapid;
	}

	public static function update(string $mapid, string $name, string $data): bool {
		self::ensureTable();

		return (bool) DBexecute(
			'UPDATE '.self::TABLE.
			' SET name='.zbx_dbstr($name).',data='.zbx_dbstr($data).',updated='.time().
			' WHERE mapid='.zbx_dbstr($mapid)
		);
	}

	public static function delete(string $mapid): bool {
		self::ensureTable();

		return (bool) DBexecute('DELETE FROM '.self::TABLE.' WHERE mapid='.zbx_dbstr($mapid));
	}
}
