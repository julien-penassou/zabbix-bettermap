<?php declare(strict_types = 0);

namespace Modules\BetterMapsWidget\Actions;

use CControllerDashboardWidgetView;
use CControllerResponseData;
use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\HostStatus;
use Modules\BetterMaps\Lib\MapStorage;

class WidgetView extends CControllerDashboardWidgetView {

	protected function doAction(): void {
		$error = null;
		$bettermap = null;
		$name = $this->getInput('name', '');

		if (!class_exists(MapStorage::class)) {
			$error = 'Le module « Better Maps » doit être activé (Administration › Général › Modules).';
		}
		elseif (!Access::canView()) {
			$error = 'Vous n\'avez pas accès aux cartes.';
		}
		else {
			$mapid = (string) $this->fields_values['mapid'];
			$map = $mapid !== '' ? MapStorage::get($mapid) : null;

			if ($map === null) {
				$error = 'Carte introuvable : choisissez une carte dans la configuration du widget.';
			}
			else {
				$doc = json_decode($map['data'], true) ?: [];

				$bettermap = [
					'mapid' => $map['mapid'],
					'name' => $map['name'],
					'updated' => (int) $map['updated'],
					'data' => $doc ?: new \stdClass(),
					'status' => (object) HostStatus::get(HostStatus::mapHostids($doc)),
					'controls' => $this->fields_values['show_controls'] == 1
				];

				if ($name === '') {
					$name = $map['name'];
				}
			}
		}

		$this->setResponse(new CControllerResponseData([
			'name' => $name !== '' ? $name : $this->widget->getDefaultName(),
			'error' => $error,
			'bettermap' => $bettermap,
			'user' => [
				'debug_mode' => $this->getDebugMode()
			]
		]));
	}
}
