<?php declare(strict_types = 0);

namespace Modules\BetterMaps;

use APP;
use CMenuItem;
use Zabbix\Core\CModule;

class Module extends CModule {

	public function init(): void {
		APP::Component()->get('menu.main')
			->findOrAdd(_('Monitoring'))
			->getSubmenu()
			->insertAfter(_('Maps'), (new CMenuItem('Cartes+'))->setAction('bettermap.list'));
	}
}
