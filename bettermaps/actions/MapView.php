<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use CController;
use CControllerResponseData;
use CControllerResponseFatal;
use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\Lang;
use Modules\BetterMaps\Lib\MapStorage;

class MapView extends CController {

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		$ret = $this->validateInput([
			'mapid' => 'required|string',
			'edit' => 'in 0,1'
		]);

		if (!$ret) {
			$this->setResponse(new CControllerResponseFatal());
		}

		return $ret;
	}

	protected function checkPermissions(): bool {
		return Access::canView();
	}

	protected function doAction(): void {
		$map = MapStorage::get($this->getInput('mapid'));

		if ($map === null) {
			$this->setResponse(new CControllerResponseFatal());

			return;
		}

		$can_edit = Access::canEdit();

		$response = new CControllerResponseData([
			'map' => [
				'mapid' => $map['mapid'],
				'name' => $map['name'],
				'data' => json_decode($map['data'], true) ?: []
			],
			'can_edit' => $can_edit,
			'edit' => $can_edit && $this->getInput('edit', 0) == 1,
			'csrf_token' => Access::csrfToken()
		]);
		$response->setTitle(Lang::t('{name} - Maps+', ['name' => $map['name']]));
		$this->setResponse($response);
	}
}
