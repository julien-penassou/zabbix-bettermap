<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Includes;

use Modules\BetterMaps\Lib\MapStorage;
use Zabbix\Widgets\{
	CWidgetField,
	CWidgetForm
};
use Zabbix\Widgets\Fields\CWidgetFieldCheckBox;

class WidgetForm extends CWidgetForm {

	public function addFields(): self {
		$maps = [];

		try {
			foreach (MapStorage::getList() as $map) {
				$maps[$map['mapid']] = $map['name'];
			}
		}
		catch (\RuntimeException $e) {
			$maps = [];
		}

		return $this
			->addField(
				(new CWidgetFieldSelectString('mapid', 'Carte', $maps))
					->setFlags(CWidgetField::FLAG_NOT_EMPTY | CWidgetField::FLAG_LABEL_ASTERISK)
			)
			->addField(
				(new CWidgetFieldCheckBox('show_controls', 'Boutons de zoom'))->setDefault(1)
			);
	}
}
