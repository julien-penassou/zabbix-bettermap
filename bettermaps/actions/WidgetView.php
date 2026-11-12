<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use CControllerDashboardWidgetView;
use CControllerResponseData;
use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\Lang;
use Modules\BetterMaps\Lib\MapStorage;
use Modules\BetterMaps\Lib\Status;

/**
 * Contenu du widget Carte+ : la carte et le statut de ses objets en une seule réponse.
 */
class WidgetView extends CControllerDashboardWidgetView {

	protected function doAction(): void {
		$error = null;
		$bettermap = null;
		$name = $this->getInput('name', '');

		if (!Access::canView()) {
			$error = Lang::t('You do not have access to maps.');
		}
		else {
			$mapid = (string) $this->fields_values['mapid'];
			$map = $mapid !== '' ? MapStorage::get($mapid) : null;

			if ($map === null) {
				$error = Lang::t('Map not found: choose a map in the widget configuration.');
			}
			else {
				$doc = json_decode($map['data'], true) ?: [];

				$bettermap = [
					'mapid' => $map['mapid'],
					'name' => $map['name'],
					'updated' => (int) $map['updated'],
					'data' => $doc ?: new \stdClass(),
					'status' => Status::get(Status::mapObjects($doc)),
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
