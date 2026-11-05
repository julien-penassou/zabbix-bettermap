<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use API;

/**
 * Statut temps réel des objets Zabbix d'une carte : hôtes, groupes d'hôtes, items et déclencheurs.
 * Les droits de l'utilisateur sont appliqués par l'API (un objet non visible n'est pas renvoyé).
 */
class Status {

	/**
	 * @param array $ids  ['hostids' => [...], 'groupids' => [...], 'itemids' => [...], 'triggerids' => [...]]
	 *
	 * @return array  ['hosts' => {hostid: …}, 'groups' => {groupid: …}, 'items' => {itemid: …},
	 *                 'triggers' => {triggerid: …}]
	 */
	public static function get(array $ids): array {
		$hostids = array_values(array_unique($ids['hostids'] ?? []));
		$groupids = array_values(array_unique($ids['groupids'] ?? []));
		$itemids = array_values(array_unique($ids['itemids'] ?? []));
		$triggerids = array_values(array_unique($ids['triggerids'] ?? []));

		$hosts = [];
		$groups = [];
		$items = [];
		$triggers = [];

		// Hôtes dont il faut chercher les problèmes : ceux de la carte, ceux des groupes, ceux des items.
		$problem_hostids = [];
		// hostid => groupids de la carte auxquels l'hôte appartient
		$group_members = [];

		if ($hostids) {
			$db_hosts = API::Host()->get([
				'output' => ['hostid', 'name', 'status', 'maintenance_status'],
				'hostids' => $hostids,
				'preservekeys' => true
			]);

			foreach ($db_hosts as $hostid => $host) {
				$hosts[$hostid] = [
					'name' => $host['name'],
					'disabled' => $host['status'] == HOST_STATUS_NOT_MONITORED,
					'maintenance' => $host['maintenance_status'] == HOST_MAINTENANCE_STATUS_ON,
					'problems' => []
				];
				$problem_hostids[$hostid] = true;
			}
		}

		if ($groupids) {
			$db_groups = API::HostGroup()->get([
				'output' => ['groupid', 'name'],
				'groupids' => $groupids,
				'preservekeys' => true
			]);

			foreach ($db_groups as $groupid => $group) {
				$groups[$groupid] = [
					'name' => $group['name'],
					'hosts' => 0,
					'maintenance' => 0,
					'problem_hosts' => [],
					'problems' => []
				];
			}

			if ($db_groups) {
				$members = API::Host()->get([
					'output' => ['hostid', 'maintenance_status'],
					'groupids' => array_keys($db_groups),
					'monitored_hosts' => true,
					'selectHostGroups' => ['groupid'],
					'preservekeys' => true
				]);

				foreach ($members as $hostid => $host) {
					foreach ($host['hostgroups'] as $hostgroup) {
						if (!array_key_exists($hostgroup['groupid'], $groups)) {
							continue;
						}

						$groups[$hostgroup['groupid']]['hosts']++;

						if ($host['maintenance_status'] == HOST_MAINTENANCE_STATUS_ON) {
							$groups[$hostgroup['groupid']]['maintenance']++;
						}

						$group_members[$hostid][] = $hostgroup['groupid'];
					}

					$problem_hostids[$hostid] = true;
				}
			}
		}

		if ($itemids) {
			$db_items = API::Item()->get([
				'output' => ['itemid', 'hostid', 'name', 'key_', 'value_type', 'units', 'lastvalue', 'lastclock', 'state',
					'status'
				],
				'selectHosts' => ['name', 'status'],
				'selectValueMap' => ['mappings'],
				'itemids' => $itemids,
				'webitems' => true,
				'preservekeys' => true
			]);

			foreach ($db_items as $itemid => $item) {
				$host = $item['hosts'][0] ?? ['name' => '', 'status' => HOST_STATUS_MONITORED];
				$has_value = $item['lastclock'] != 0;

				$items[$itemid] = [
					'name' => $item['name'],
					'key' => $item['key_'],
					'hostid' => $item['hostid'],
					'host' => $host['name'],
					'value' => $has_value ? formatHistoryValue($item['lastvalue'], $item) : null,
					'clock' => (int) $item['lastclock'],
					'numeric' => in_array($item['value_type'], [ITEM_VALUE_TYPE_FLOAT, ITEM_VALUE_TYPE_UINT64]),
					'unsupported' => $item['state'] == ITEM_STATE_NOTSUPPORTED,
					'disabled' => $item['status'] != ITEM_STATUS_ACTIVE || $host['status'] == HOST_STATUS_NOT_MONITORED,
					'problems' => []
				];
				$problem_hostids[$item['hostid']] = true;
			}
		}

		if ($triggerids) {
			$db_triggers = API::Trigger()->get([
				'output' => ['triggerid', 'description', 'priority', 'value', 'status', 'state'],
				'selectHosts' => ['hostid', 'name', 'status'],
				'selectItems' => ['itemid', 'value_type'],
				'triggerids' => $triggerids,
				'expandDescription' => true,
				'preservekeys' => true
			]);

			foreach ($db_triggers as $triggerid => $trigger) {
				$host = $trigger['hosts'][0] ?? ['hostid' => '', 'name' => '', 'status' => HOST_STATUS_MONITORED];

				$triggers[$triggerid] = [
					'name' => $trigger['description'],
					'hostid' => $host['hostid'],
					'host' => $host['name'],
					'severity' => (int) $trigger['priority'],
					'unsupported' => $trigger['state'] == TRIGGER_STATE_UNKNOWN,
					'disabled' => $trigger['status'] != TRIGGER_STATUS_ENABLED
						|| $host['status'] == HOST_STATUS_NOT_MONITORED,
					// Items numériques de l'expression, pour le graphique.
					'graph_itemids' => array_values(array_column(array_filter($trigger['items'],
						fn($item) => in_array($item['value_type'], [ITEM_VALUE_TYPE_FLOAT, ITEM_VALUE_TYPE_UINT64])
					), 'itemid')),
					'problems' => []
				];

				foreach ($trigger['hosts'] as $trigger_host) {
					$problem_hostids[$trigger_host['hostid']] = true;
				}
			}
		}

		if ($problem_hostids) {
			self::addProblems(array_keys($problem_hostids), $hosts, $groups, $items, $triggers, $group_members);
		}

		foreach ($groups as &$group) {
			$group['problem_hosts'] = count($group['problem_hosts']);
			$group['problems'] = array_values($group['problems']);
		}
		unset($group);

		return [
			'hosts' => (object) $hosts,
			'groups' => (object) $groups,
			'items' => (object) $items,
			'triggers' => (object) $triggers
		];
	}

	/**
	 * Répartit les problèmes actifs entre hôtes, groupes (via leurs hôtes), items (via les déclencheurs)
	 * et déclencheurs.
	 */
	private static function addProblems(array $hostids, array &$hosts, array &$groups, array &$items,
			array &$triggers, array $group_members): void {
		$problems = API::Problem()->get([
			'output' => ['eventid', 'objectid', 'name', 'severity', 'clock', 'acknowledged'],
			'source' => EVENT_SOURCE_TRIGGERS,
			'object' => EVENT_OBJECT_TRIGGER,
			'hostids' => $hostids,
			'suppressed' => false,
			'symptom' => false,
			'sortfield' => ['eventid'],
			'sortorder' => ZBX_SORT_DOWN
		]);

		if (!$problems) {
			return;
		}

		$db_triggers = API::Trigger()->get([
			'output' => [],
			'selectHosts' => ['hostid', 'name'],
			'selectItems' => $items ? ['itemid'] : null,
			'triggerids' => array_unique(array_column($problems, 'objectid')),
			'preservekeys' => true
		]);

		foreach ($problems as $problem) {
			if (!array_key_exists($problem['objectid'], $db_triggers)) {
				continue;
			}

			$trigger = $db_triggers[$problem['objectid']];
			$entry = [
				'eventid' => $problem['eventid'],
				'name' => $problem['name'],
				'host' => $trigger['hosts'] ? $trigger['hosts'][0]['name'] : '',
				'severity' => (int) $problem['severity'],
				'clock' => (int) $problem['clock'],
				'acknowledged' => $problem['acknowledged'] == EVENT_ACKNOWLEDGED
			];

			foreach ($trigger['hosts'] as $trigger_host) {
				$hostid = $trigger_host['hostid'];

				if (array_key_exists($hostid, $hosts)) {
					$hosts[$hostid]['problems'][] = $entry;
				}

				foreach ($group_members[$hostid] ?? [] as $groupid) {
					// Un déclencheur sur plusieurs hôtes du même groupe ne compte qu'une fois.
					$groups[$groupid]['problems'][$problem['eventid']] = $entry;
					$groups[$groupid]['problem_hosts'][$hostid] = true;
				}
			}

			foreach ($trigger['items'] ?? [] as $trigger_item) {
				if (array_key_exists($trigger_item['itemid'], $items)) {
					$items[$trigger_item['itemid']]['problems'][] = $entry;
				}
			}

			if (array_key_exists($problem['objectid'], $triggers)) {
				$triggers[$problem['objectid']]['problems'][] = $entry;
			}
		}
	}

	/**
	 * Identifiants des objets Zabbix utilisés dans une carte.
	 */
	public static function mapObjects(array $data): array {
		$ids = ['hostids' => [], 'groupids' => [], 'itemids' => [], 'triggerids' => []];
		$fields = ['host' => ['hostid', 'hostids'], 'group' => ['groupid', 'groupids'], 'item' => ['itemid', 'itemids'],
			'trigger' => ['triggerid', 'triggerids']];

		foreach ($data['nodes'] ?? [] as $node) {
			if (!is_array($node) || !array_key_exists($node['type'] ?? '', $fields)) {
				continue;
			}

			[$field, $key] = $fields[$node['type']];

			if (ctype_digit((string) ($node[$field] ?? ''))) {
				$ids[$key][] = (string) $node[$field];
			}
		}

		// Déclencheurs des liens colorés selon « autre(s) déclencheur(s) ».
		foreach ($data['links'] ?? [] as $link) {
			if (!is_array($link) || ($link['status'] ?? '') !== 'triggers' || !is_array($link['triggers'] ?? null)) {
				continue;
			}

			foreach ($link['triggers'] as $trigger) {
				if (is_array($trigger) && ctype_digit((string) ($trigger['triggerid'] ?? ''))) {
					$ids['triggerids'][] = (string) $trigger['triggerid'];
				}
			}
		}

		return array_map(fn($list) => array_values(array_unique($list)), $ids);
	}
}
