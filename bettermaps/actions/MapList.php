<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use CController;
use CControllerResponseData;
use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\Lang;
use Modules\BetterMaps\Lib\MapStorage;

class MapList extends CController {

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		return true;
	}

	protected function checkPermissions(): bool {
		return Access::canView();
	}

	protected function doAction(): void {
		$error = null;

		try {
			$maps = MapStorage::getList();
		}
		catch (\RuntimeException $e) {
			$maps = [];
			$error = $e->getMessage();
		}

		$response = new CControllerResponseData([
			'maps' => $maps,
			'can_edit' => Access::canEdit(),
			'csrf_token' => Access::csrfToken(),
			'error' => $error
		]);
		$response->setTitle(Lang::t('Maps+'));
		$this->setResponse($response);
	}
}
