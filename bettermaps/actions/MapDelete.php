<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\JsonController;
use Modules\BetterMaps\Lib\MapStorage;

class MapDelete extends JsonController {

	protected bool $is_write = true;

	protected function checkInput(): bool {
		return $this->validateJson([
			'mapid' => 'required|string'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$ok = MapStorage::delete($this->getInput('mapid'));

		$this->respond($ok ? ['result' => true] : ['error' => 'Échec de la suppression.']);
	}
}
