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
	private const WIDGET_JS = 'class.widget.js';

	public static function tags(): array {
		$module = APP::ModuleManager()->getModule(self::MODULE_ID);
		$base = $module->getRelativePath().'/assets/';
		$version = $module->getVersion();

		$tags = [];

		foreach ($module->getAssets()['css'] as $file) {
			$tags[] = (new CTag('link'))
				->setAttribute('rel', 'stylesheet')
				->setAttribute('href', (new CUrl($base.'css/'.$file))->setArgument('v', $version)->getUrl());
		}

		// Catalogues de traduction et éditeur ; la classe du widget n'a de sens que sur un tableau de bord.
		foreach ($module->getAssets()['js'] as $file) {
			if ($file !== self::WIDGET_JS) {
				$tags[] = (new CTag('script', true))
					->setAttribute('src', (new CUrl($base.'js/'.$file))->setArgument('v', $version)->getUrl());
			}
		}

		return $tags;
	}
}
