<?php declare(strict_types = 0);

namespace Modules\BetterMapsWidget\Includes;

use Zabbix\Widgets\Fields\CWidgetFieldSelect;

/**
 * Liste déroulante dont la valeur est enregistrée comme texte
 * (les identifiants des cartes Cartes+ ne sont pas numériques).
 */
class CWidgetFieldSelectString extends CWidgetFieldSelect {

	public function __construct(string $name, string $label, array $values) {
		parent::__construct($name, $label, $values);

		$this->setSaveType(ZBX_WIDGET_FIELD_TYPE_STR);
	}
}
