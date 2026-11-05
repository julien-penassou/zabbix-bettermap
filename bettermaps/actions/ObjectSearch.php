<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Actions;

use API;
use Modules\BetterMaps\Lib\Access;
use Modules\BetterMaps\Lib\JsonController;

/**
 * Recherche d'objets Zabbix pour l'éditeur : hôtes, groupes d'hôtes, items et déclencheurs d'un hôte.
 */
class ObjectSearch extends JsonController {

	protected function checkInput(): bool {
		return $this->validateJson([
			'type' => 'required|in host,group,item,trigger',
			'search' => 'string',
			'hostid' => 'id'
		]);
	}

	protected function checkPermissions(): bool {
		return Access::canEdit();
	}

	protected function doAction(): void {
		$search = trim($this->getInput('search', ''));
		$results = [];

		switch ($this->getInput('type')) {
			case 'host':
				$options = ['output' => ['hostid', 'name'], 'sortfield' => 'name', 'limit' => 30];

				if ($search !== '') {
					$options['search'] = ['name' => $search];
				}

				foreach (API::Host()->get($options) as $host) {
					$results[] = ['id' => $host['hostid'], 'name' => $host['name']];
				}
				break;

			case 'group':
				$options = ['output' => ['groupid', 'name'], 'sortfield' => 'name', 'limit' => 30];

				if ($search !== '') {
					$options['search'] = ['name' => $search];
				}

				foreach (API::HostGroup()->get($options) as $group) {
					$results[] = ['id' => $group['groupid'], 'name' => $group['name']];
				}
				break;

			case 'item':
				if (!$this->hasInput('hostid')) {
					break;
				}

				$options = [
					'output' => ['itemid', 'name', 'key_'],
					'hostids' => [$this->getInput('hostid')],
					'webitems' => true,
					'sortfield' => 'name',
					'limit' => 50
				];

				if ($search !== '') {
					$options['search'] = ['name' => $search, 'key_' => $search];
					$options['searchByAny'] = true;
				}

				foreach (API::Item()->get($options) as $item) {
					$results[] = ['id' => $item['itemid'], 'name' => $item['name'], 'detail' => $item['key_']];
				}
				break;

			case 'trigger':
				if (!$this->hasInput('hostid')) {
					break;
				}

				$options = [
					'output' => ['triggerid', 'description', 'priority'],
					'hostids' => [$this->getInput('hostid')],
					'expandDescription' => true,
					'sortfield' => 'description',
					'limit' => 50
				];

				if ($search !== '') {
					$options['search'] = ['description' => $search];
				}

				foreach (API::Trigger()->get($options) as $trigger) {
					$results[] = [
						'id' => $trigger['triggerid'],
						'name' => $trigger['description'],
						'severity' => (int) $trigger['priority']
					];
				}
				break;
		}

		$this->respond(['results' => $results]);
	}
}
