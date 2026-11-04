<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\JsonController;
use Modules\BetterMaps\Lib\MapStorage;

class MapCreate extends JsonController {

	protected bool $is_write = true;

	protected function checkInput(): bool {
		return $this->validateJson([
			'name' => 'required|string|not_empty'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$name = mb_substr(trim($this->getInput('name')), 0, 255);

		try {
			$this->respond(['mapid' => MapStorage::create($name)]);
		}
		catch (\RuntimeException $e) {
			$this->respond(['error' => $e->getMessage()]);
		}
	}
}
