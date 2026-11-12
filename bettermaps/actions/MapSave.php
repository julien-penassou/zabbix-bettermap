<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\JsonController;
use Modules\BetterMaps\Lib\Lang;
use Modules\BetterMaps\Lib\MapStorage;

class MapSave extends JsonController {

	private const MAX_SIZE = 8 * 1024 * 1024;

	protected bool $is_write = true;

	protected function checkInput(): bool {
		return $this->validateJson([
			'mapid' => 'required|string',
			'name' => 'required|string|not_empty',
			'data' => 'required|string'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$mapid = $this->getInput('mapid');
		$raw = $this->getInput('data');

		if (strlen($raw) > self::MAX_SIZE) {
			$this->respond(['error' => Lang::t('Map too large.')]);

			return;
		}

		$data = json_decode($raw, true);

		if (!is_array($data) || !isset($data['nodes'], $data['links'])
				|| !is_array($data['nodes']) || !is_array($data['links'])) {
			$this->respond(['error' => Lang::t('Invalid map data.')]);

			return;
		}

		if (MapStorage::get($mapid) === null) {
			$this->respond(['error' => Lang::t('This map no longer exists.')]);

			return;
		}

		$name = mb_substr(trim($this->getInput('name')), 0, 255);
		$ok = MapStorage::update($mapid, $name, json_encode($data, JSON_UNESCAPED_UNICODE));

		$this->respond($ok ? ['result' => true] : ['error' => Lang::t('Saving failed.')]);
	}
}
