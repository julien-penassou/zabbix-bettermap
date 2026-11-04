<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use APP;
use CTag;
use CUrl;

/**
 * Zabbix ne charge les fichiers JS/CSS d'un module de type "widget" que sur les tableaux de bord :
 * les pages Cartes+ les incluent donc elles-mêmes.
 */
class Assets {

	public const MODULE_ID = 'bettermaps';

	public static function tags(): array {
		$module = APP::ModuleManager()->getModule(self::MODULE_ID);
		$base = $module->getRelativePath().'/assets/';
		$version = $module->getVersion();

		return [
			(new CTag('link'))
				->setAttribute('rel', 'stylesheet')
				->setAttribute('href', (new CUrl($base.'css/bettermap.css'))->setArgument('v', $version)->getUrl()),
			(new CTag('script', true))
				->setAttribute('src', (new CUrl($base.'js/bettermap.js'))->setArgument('v', $version)->getUrl())
		];
	}
}
