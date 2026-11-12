<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use CWebUser;

/**
 * Traduction des messages côté serveur. Les textes sont écrits en anglais ; lang/<code>.php renvoie
 * ['texte anglais' => 'traduction']. La langue est celle de l'utilisateur Zabbix, qui vaut celle du
 * serveur tant que l'utilisateur garde « Valeur par défaut du système ».
 */
class Lang {

	private static ?array $dict = null;

	public static function code(): string {
		$lang = CWebUser::$data ? CWebUser::getLang() : 'en';

		return preg_match('/^[a-z]{2,3}$/', $lang) ? $lang : 'en';
	}

	/**
	 * @param string $text    texte anglais
	 * @param array  $params  valeurs des marques {nom}
	 */
	public static function t(string $text, array $params = []): string {
		if (self::$dict === null) {
			$file = __DIR__.'/../lang/'.self::code().'.php';
			self::$dict = is_file($file) ? (array) include $file : [];
		}

		$text = self::$dict[$text] ?? $text;

		foreach ($params as $key => $value) {
			$text = str_replace('{'.$key.'}', (string) $value, $text);
		}

		return $text;
	}
}
