<?php declare(strict_types = 0);

namespace Modules\BetterMaps;

use APP;
use CMenuItem;
use Zabbix\Core\CWidget;

/**
 * Module de type "widget" : fournit le widget Carte+ et, via init(), la page Surveillance › Cartes+.
 */
class Widget extends CWidget {

	public function init(): void {
		APP::Component()->get('menu.main')
			->findOrAdd(_('Monitoring'))
			->getSubmenu()
			->insertAfter(_('Maps'), (new CMenuItem('Cartes+'))->setAction('bettermap.list'));
	}

	public function getDefaultName(): string {
		return 'Carte+';
	}
}
