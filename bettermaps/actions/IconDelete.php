<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\IconStorage;
use Modules\BetterMaps\Lib\JsonController;
use Modules\BetterMaps\Lib\Lang;

/**
 * Suppression d'une icône personnalisée. Les nœuds qui l'utilisent affichent ensuite l'icône générique.
 */
class IconDelete extends JsonController {

	protected bool $is_write = true;

	protected function checkInput(): bool {
		return $this->validateJson([
			'iconid' => 'required|string'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$ok = IconStorage::delete($this->getInput('iconid'));

		$this->respond($ok ? ['result' => true] : ['error' => Lang::t('Deletion failed.')]);
	}
}
