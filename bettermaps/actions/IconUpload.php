<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\IconStorage;
use Modules\BetterMaps\Lib\JsonController;

/**
 * Ajout d'une icône personnalisée. data : contenu du fichier en data URL (data:…;base64,…).
 */
class IconUpload extends JsonController {

	protected bool $is_write = true;

	protected function checkInput(): bool {
		return $this->validateJson([
			'name' => 'required|string|not_empty',
			'data' => 'required|string'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		if (!preg_match('/^data:[^;,]*;base64,(.*)$/s', $this->getInput('data'), $m)
				|| ($content = base64_decode($m[1], true)) === false) {
			$this->respond(['error' => 'Fichier illisible.']);

			return;
		}

		try {
			$this->respond(['icon' => IconStorage::create($this->getInput('name'), $content)]);
		}
		catch (\InvalidArgumentException|\RuntimeException $e) {
			$this->respond(['error' => $e->getMessage()]);
		}
	}
}
