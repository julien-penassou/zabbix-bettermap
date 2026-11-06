<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\IconStorage;
use Modules\BetterMaps\Lib\JsonController;

/**
 * Icônes personnalisées proposées dans l'éditeur.
 */
class IconList extends JsonController {

	protected function checkInput(): bool {
		return $this->validateJson([]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$this->respond(['icons' => IconStorage::getList()]);
	}
}
