<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use CController;
use Modules\BetterMaps\Lib\IconStorage;
use Modules\BetterMaps\Lib\Lang;

/**
 * Contenu d'une icône personnalisée, pour les cartes et le widget de tout utilisateur connecté.
 * Une icône ne change jamais (une nouvelle version = une nouvelle icône) : elle peut rester en cache.
 */
class IconView extends CController {

	protected function init(): void {
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		$ret = $this->validateInput([
			'iconid' => 'required|string'
		]);

		if (!$ret) {
			$this->notFound();
		}

		return $ret;
	}

	protected function checkPermissions(): bool {
		return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
	}

	protected function doAction(): void {
		$icon = IconStorage::get($this->getInput('iconid'));

		if ($icon === null) {
			$this->notFound();
		}

		while (ob_get_level() > 0) {
			ob_end_clean();
		}

		header('Content-Type: '.$icon['mime']);
		header('Content-Length: '.strlen($icon['data']));
		header('Cache-Control: private, max-age=604800, immutable');
		header('X-Content-Type-Options: nosniff');
		// Ouvert directement, un SVG ne peut ni exécuter de script ni charger quoi que ce soit.
		header('Content-Security-Policy: default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; sandbox');
		echo $icon['data'];
		exit;
	}

	private function notFound(): void {
		while (ob_get_level() > 0) {
			ob_end_clean();
		}

		http_response_code(404);
		header('Content-Type: text/plain; charset=utf-8');
		echo Lang::t('Icon not found.');
		exit;
	}
}
