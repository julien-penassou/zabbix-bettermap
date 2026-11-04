<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\HostStatus;
use Modules\BetterMaps\Lib\JsonController;

/**
 * Statut temps réel des hôtes d'une carte.
 */
class MapStatus extends JsonController {

	protected function checkInput(): bool {
		return $this->validateJson([
			'hostids' => 'array_id'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canView();
	}

	protected function doAction(): void {
		$this->respond(['hosts' => (object) HostStatus::get($this->getInput('hostids', []))]);
	}
}
