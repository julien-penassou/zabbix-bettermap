<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use CController;
use CControllerResponseData;

/**
 * Base des actions AJAX du module : réponse JSON, contrôle CSRF maison pour les écritures.
 */
abstract class JsonController extends CController {

	/** Les actions qui modifient des données exigent un jeton CSRF valide. */
	protected bool $is_write = false;

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function validateJson(array $rules): bool {
		if ($this->is_write) {
			$rules[CSRF_TOKEN_NAME] = 'required|string';
		}

		$ret = $this->validateInput($rules);

		if ($ret && $this->is_write && !Access::checkCsrf($this->getInput(CSRF_TOKEN_NAME))) {
			$ret = false;
		}

		if (!$ret) {
			$this->respond(['error' => 'Requête invalide ou session expirée.']);
		}

		return $ret;
	}

	protected function respond(array $data): void {
		$this->setResponse(new CControllerResponseData(['main_block' => json_encode($data)]));
	}
}
