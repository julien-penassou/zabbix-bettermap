<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

/**
 * Icônes personnalisées (SVG, PNG, JPEG, GIF, WebP), partagées par toutes les cartes, stockées dans une table
 * dédiée (bettermaps_icon) de la base Zabbix. La table est créée automatiquement au premier accès.
 */
class IconStorage {

	public const TABLE = 'bettermaps_icon';

	public const MAX_SIZE = 1024 * 1024;

	private const RASTER_TYPES = [
		IMAGETYPE_PNG => 'image/png',
		IMAGETYPE_JPEG => 'image/jpeg',
		IMAGETYPE_GIF => 'image/gif',
		IMAGETYPE_WEBP => 'image/webp'
	];

	// Éléments SVG refusés : scripts et contenus actifs ou externes.
	private const SVG_FORBIDDEN = ['script', 'foreignobject', 'iframe', 'embed', 'object', 'audio', 'video'];

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
			$sql = 'CREATE TABLE '.self::TABLE.' ('.
				'iconid varchar(32) NOT NULL,'.
				'name varchar(255) NOT NULL DEFAULT \'\','.
				'mime varchar(64) NOT NULL DEFAULT \'\','.
				'data '.($is_mysql ? 'longtext' : 'text').' NOT NULL,'.
				'updated integer NOT NULL DEFAULT 0,'.
				'PRIMARY KEY (iconid)'.
			')'.($is_mysql ? ' ENGINE=InnoDB' : '');

			if (!DBexecute($sql)) {
				throw new \RuntimeException(Lang::t('Unable to create table {table}. Create it manually with the script in the '.
					'module\'s sql/ folder.', ['table' => self::TABLE])
				);
			}
		}

		self::$ready = true;
	}

	public static function isId(string $iconid): bool {
		return strlen($iconid) === 16 && ctype_xdigit($iconid);
	}

	/**
	 * @return array  [['iconid' => …, 'name' => …, 'mime' => …], …] triées par nom.
	 */
	public static function getList(): array {
		self::ensureTable();

		$icons = [];
		$result = DBselect('SELECT iconid,name,mime FROM '.self::TABLE.' ORDER BY name');

		while ($row = DBfetch($result)) {
			$icons[] = $row;
		}

		return $icons;
	}

	/**
	 * @return array|null  ['mime' => …, 'data' => contenu binaire]
	 */
	public static function get(string $iconid): ?array {
		if (!self::isId($iconid)) {
			return null;
		}

		self::ensureTable();

		$row = DBfetch(DBselect(
			'SELECT mime,data FROM '.self::TABLE.' WHERE iconid='.zbx_dbstr($iconid)
		));

		return $row ? ['mime' => $row['mime'], 'data' => base64_decode($row['data'])] : null;
	}

	/**
	 * Enregistre une icône après contrôle de son contenu.
	 *
	 * @return array  ['iconid' => …, 'name' => …, 'mime' => …]
	 *
	 * @throws \InvalidArgumentException  fichier refusé (message destiné à l'utilisateur)
	 */
	public static function create(string $name, string $content): array {
		if ($content === '' || strlen($content) > self::MAX_SIZE) {
			throw new \InvalidArgumentException(Lang::t('Empty or too large file (1 MB max).'));
		}

		$mime = self::detectMime($content);

		self::ensureTable();

		$iconid = bin2hex(random_bytes(8));
		$name = mb_substr(trim($name), 0, 255);

		$ok = DBexecute(
			'INSERT INTO '.self::TABLE.' (iconid,name,mime,data,updated) VALUES ('.
				zbx_dbstr($iconid).','.zbx_dbstr($name).','.zbx_dbstr($mime).','.
				zbx_dbstr(base64_encode($content)).','.time().
			')'
		);

		if (!$ok) {
			throw new \RuntimeException(Lang::t('Saving the icon failed.'));
		}

		return ['iconid' => $iconid, 'name' => $name, 'mime' => $mime];
	}

	public static function delete(string $iconid): bool {
		if (!self::isId($iconid)) {
			return false;
		}

		self::ensureTable();

		return (bool) DBexecute('DELETE FROM '.self::TABLE.' WHERE iconid='.zbx_dbstr($iconid));
	}

	/**
	 * Type réel du fichier (d'après son contenu, pas son nom).
	 *
	 * @throws \InvalidArgumentException
	 */
	private static function detectMime(string $content): string {
		$info = @getimagesizefromstring($content);

		if ($info !== false && array_key_exists($info[2], self::RASTER_TYPES)) {
			return self::RASTER_TYPES[$info[2]];
		}

		self::checkSvg($content);

		return 'image/svg+xml';
	}

	/**
	 * Un SVG n'est accepté que s'il est un document XML bien formé, sans DTD, sans script, sans gestionnaire
	 * d'évènement et sans référence externe.
	 *
	 * @throws \InvalidArgumentException
	 */
	private static function checkSvg(string $content): void {
		$invalid = new \InvalidArgumentException(
			Lang::t('Unrecognized format: only SVG, PNG, JPEG, GIF and WebP files are accepted.')
		);

		if (stripos($content, '<svg') === false) {
			throw $invalid;
		}

		// Pas de DTD : ni entités (XXE, explosion d'entités), ni déclarations externes.
		if (stripos($content, '<!DOCTYPE') !== false || stripos($content, '<!ENTITY') !== false) {
			throw new \InvalidArgumentException(Lang::t('SVG rejected: DOCTYPE / ENTITY declarations are not allowed.'));
		}

		$doc = new \DOMDocument();
		$previous = libxml_use_internal_errors(true);
		$loaded = $doc->loadXML($content, LIBXML_NONET);
		libxml_clear_errors();
		libxml_use_internal_errors($previous);

		if (!$loaded || $doc->documentElement === null || strtolower($doc->documentElement->localName) !== 'svg') {
			throw $invalid;
		}

		foreach ($doc->getElementsByTagName('*') as $element) {
			if (in_array(strtolower($element->localName), self::SVG_FORBIDDEN, true)) {
				throw new \InvalidArgumentException(Lang::t('SVG rejected: it contains a <{element}> element.',
					['element' => $element->localName]
				));
			}

			foreach ($element->attributes as $attribute) {
				$attr = strtolower($attribute->localName);
				$value = strtolower(preg_replace('/\s+/', '', $attribute->value));

				if (str_starts_with($attr, 'on')) {
					throw new \InvalidArgumentException(Lang::t('SVG rejected: it contains an event handler ({attribute}).',
						['attribute' => $attribute->localName]
					));
				}

				// Liens : uniquement internes (#id) ou images embarquées.
				if ($attr === 'href' && $value !== '' && $value[0] !== '#'
						&& !preg_match('#^data:image/(png|jpeg|gif|webp);#', $value)) {
					throw new \InvalidArgumentException(Lang::t('SVG rejected: it references an external resource.'));
				}

				if (self::hasExternalRef($value)) {
					throw new \InvalidArgumentException(Lang::t('SVG rejected: it references an external resource.'));
				}
			}

			if (strtolower($element->localName) === 'style'
					&& self::hasExternalRef(strtolower(preg_replace('/\s+/', '', $element->textContent)))) {
				throw new \InvalidArgumentException(
					Lang::t('SVG rejected: its stylesheet references an external resource.')
				);
			}
		}
	}

	// Valeur (sans espaces, en minuscules) : javascript:, @import ou url() ailleurs que vers un #id du document.
	private static function hasExternalRef(string $value): bool {
		return str_contains($value, 'javascript:') || str_contains($value, '@import')
			|| (bool) preg_match('/url\((?![\'"]?#)/', $value);
	}
}
