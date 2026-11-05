<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\JsonController;
use Modules\BetterMaps\Lib\Status;

/**
 * Statut temps réel des objets d'une carte : hôtes, groupes d'hôtes, items.
 */
class MapStatus extends JsonController {

	protected function checkInput(): bool {
		return $this->validateJson([
			'hostids' => 'array_id',
			'groupids' => 'array_id',
			'itemids' => 'array_id'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canView();
	}

	protected function doAction(): void {
		$this->respond(Status::get([
			'hostids' => $this->getInput('hostids', []),
			'groupids' => $this->getInput('groupids', []),
			'itemids' => $this->getInput('itemids', [])
		]));
	}
}
