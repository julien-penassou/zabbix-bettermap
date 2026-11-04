<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use API;
use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\JsonController;

class HostSearch extends JsonController {

	protected function checkInput(): bool {
		return $this->validateJson([
			'search' => 'string'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$search = trim($this->getInput('search', ''));

		$options = [
			'output' => ['hostid', 'name'],
			'sortfield' => 'name',
			'limit' => 30
		];

		if ($search !== '') {
			$options['search'] = ['name' => $search];
		}

		$this->respond(['hosts' => array_values(API::Host()->get($options))]);
	}
}
