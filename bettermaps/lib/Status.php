<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use API;
use CMacrosResolverHelper;

/**
 * Statut temps réel des objets Zabbix d'une carte : hôtes, groupes d'hôtes, items et déclencheurs.
 * Les droits de l'utilisateur sont appliqués par l'API (un objet non visible n'est pas renvoyé).
 */
class Status {

	/** Macros d'hôte et d'inventaire acceptées dans les libellés (même motif que LABEL_MACRO dans bettermap.js). */
	private const HOST_MACRO = '(?:HOST\.(?:ID|HOST|NAME|DESCRIPTION|IP|DNS|CONN|PORT)|INVENTORY\.[A-Z.]+)';

	/** Interface d'un hôte, par ordre de préférence : le même que celui de Zabbix. */
	private const INTERFACE_PRIORITY = [INTERFACE_TYPE_AGENT, INTERFACE_TYPE_SNMP, INTERFACE_TYPE_JMX,
		INTERFACE_TYPE_IPMI
	];

	/**
	 * @param array $ids  ['hostids' => [...], 'groupids' => [...], 'itemids' => [...], 'triggerids' => [...],
	 *                    'macros' => noms des macros d'hôte utilisées dans les libellés (HOST.IP…),
	 *                    'labels' => libellés de liens contenant des macros d'expression ({?last(/hôte/clé)})]
	 *
	 * @return array  ['hosts' => {hostid: …}, 'groups' => {groupid: …}, 'items' => {itemid: …},
	 *                 'triggers' => {triggerid: …}, 'macros' => {hostid: {macro: valeur}},
	 *                 'labels' => {libellé: libellé résolu}]
	 */
	public static function get(array $ids): array {
		$hostids = array_values(array_unique($ids['hostids'] ?? []));
		$groupids = array_values(array_unique($ids['groupids'] ?? []));
		$itemids = array_values(array_unique($ids['itemids'] ?? []));
		$triggerids = array_values(array_unique($ids['triggerids'] ?? []));

		$macros = array_values(array_unique($ids['macros'] ?? []));
		// itemid => interfaceid
		$item_interfaces = [];

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
					'status', 'interfaceid'
				],
				'selectHosts' => ['name', 'status'],
				'selectValueMap' => ['mappings'],
				'itemids' => $itemids,
				'webitems' => true,
				'preservekeys' => true
			]);

			foreach ($db_items as $itemid => $item) {
				$host = $item['hosts'][0] ?? ['name' => '', 'status' => HOST_STATUS_MONITORED];
				$item_interfaces[$itemid] = $item['interfaceid'];
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

		$host_macros = $macros
			? self::addMacros($macros, array_keys($hosts), $items, $triggers, $item_interfaces)
			: [];

		foreach ($groups as &$group) {
			$group['problem_hosts'] = count($group['problem_hosts']);
			$group['problems'] = array_values($group['problems']);
		}
		unset($group);

		return [
			'hosts' => (object) $hosts,
			'groups' => (object) $groups,
			'items' => (object) $items,
			'triggers' => (object) $triggers,
			'macros' => (object) $host_macros,
			'labels' => (object) self::resolveLabels($ids['labels'] ?? [])
		];
	}

	/**
	 * Valeurs des macros d'hôte demandées, pour les hôtes de la carte et ceux des items et des déclencheurs.
	 * Les macros d'interface d'un item sont celles de sa propre interface (clé 'macros' de l'item).
	 *
	 * @return array  hostid => {macro: valeur} ; une macro sans valeur (pas d'interface, inventaire désactivé,
	 *                macro inconnue) est absente.
	 */
	private static function addMacros(array $macros, array $hostids, array &$items, array $triggers,
			array $item_interfaces): array {
		$hostids = array_merge($hostids, array_column($items, 'hostid'), array_column($triggers, 'hostid'));
		$hostids = array_values(array_unique(array_filter($hostids)));

		if (!$hostids) {
			return [];
		}

		// Champs d'inventaire demandés : macro => champ.
		$inventory = [];

		if (preg_grep('/^INVENTORY\./', $macros)) {
			foreach (array_column(getHostInventories(), 'db_field') as $field) {
				$macro = 'INVENTORY.'.strtoupper(strtr($field, ['date_hw_' => 'hw.date.', 'poc_1_' => 'poc.primary.',
					'poc_2_' => 'poc.secondary.', '_' => '.'
				]));

				if (in_array($macro, $macros, true)) {
					$inventory[$macro] = $field;
				}
			}
		}

		$options = [
			'output' => ['hostid', 'host', 'name', 'description', 'inventory_mode'],
			'hostids' => $hostids,
			'preservekeys' => true
		];
		$with_interfaces = (bool) array_intersect($macros, ['HOST.IP', 'HOST.DNS', 'HOST.CONN', 'HOST.PORT']);

		if ($with_interfaces) {
			$options['selectInterfaces'] = ['interfaceid', 'hostid', 'type', 'main', 'useip', 'ip', 'dns', 'port'];
		}

		if ($inventory) {
			$options['selectInventory'] = array_values($inventory);
		}

		$result = [];
		$interfaces = [];

		foreach (API::Host()->get($options) as $hostid => $host) {
			$values = [
				'HOST.ID' => (string) $hostid,
				'HOST.HOST' => $host['host'],
				'HOST.NAME' => $host['name'],
				'HOST.DESCRIPTION' => $host['description']
			];

			if ($host['inventory_mode'] != HOST_INVENTORY_DISABLED) {
				foreach ($inventory as $macro => $field) {
					if (isset($host['inventory'][$field])) {
						$values[$macro] = $host['inventory'][$field];
					}
				}
			}

			// Macros utilisateur dans les adresses : les valeurs secrètes sont masquées par Zabbix.
			$host_interfaces = $with_interfaces
				? array_column(CMacrosResolverHelper::resolveHostInterfaces($host['interfaces']), null, 'interfaceid')
				: [];
			$interfaces += $host_interfaces;

			foreach (self::INTERFACE_PRIORITY as $type) {
				foreach ($host_interfaces as $interface) {
					if ($interface['type'] == $type && $interface['main'] == INTERFACE_PRIMARY) {
						$values += self::interfaceMacros($interface);
						break 2;
					}
				}
			}

			$result[$hostid] = (object) array_intersect_key($values, array_flip($macros));
		}

		foreach ($item_interfaces as $itemid => $interfaceid) {
			if (array_key_exists($interfaceid, $interfaces)) {
				$items[$itemid]['macros'] = self::interfaceMacros($interfaces[$interfaceid]);
			}
		}

		return $result;
	}

	/**
	 * Libellés de liens : macros d'expression ({?last(/hôte/clé)}, {?avg(/hôte/clé,5m)}…) résolues par Zabbix,
	 * comme dans ses cartes natives (unités, droits de l'utilisateur, *UNKNOWN* si l'item est inaccessible).
	 *
	 * @return array  libellé => libellé résolu
	 */
	private static function resolveLabels(array $labels): array {
		$labels = array_values(array_unique(array_filter($labels,
			fn($label) => is_string($label) && strpos($label, '{?') !== false
		)));

		if (!$labels) {
			return [];
		}

		$links = CMacrosResolverHelper::resolveMapLinkLabelMacros(array_map(fn($label) => ['label' => $label],
			array_slice($labels, 0, 500)
		));

		return array_combine(array_slice($labels, 0, count($links)), array_column($links, 'label'));
	}

	private static function interfaceMacros(array $interface): array {
		return [
			'HOST.IP' => $interface['ip'],
			'HOST.DNS' => $interface['dns'],
			'HOST.CONN' => $interface['useip'] == INTERFACE_USE_IP ? $interface['ip'] : $interface['dns'],
			'HOST.PORT' => $interface['port']
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
	 * Identifiants des objets Zabbix utilisés dans une carte, et macros d'hôte de leurs libellés.
	 */
	public static function mapObjects(array $data): array {
		$ids = ['hostids' => [], 'groupids' => [], 'itemids' => [], 'triggerids' => [], 'macros' => [],
			'labels' => []
		];
		$fields = ['host' => ['hostid', 'hostids'], 'group' => ['groupid', 'groupids'], 'item' => ['itemid', 'itemids'],
			'trigger' => ['triggerid', 'triggerids']];

		foreach ($data['nodes'] ?? [] as $node) {
			if (!is_array($node) || !array_key_exists($node['type'] ?? '', $fields)) {
				continue;
			}

			[$field, $key] = $fields[$node['type']];

			if (ctype_digit((string) ($node[$field] ?? ''))) {
				$ids[$key][] = (string) $node[$field];

				if ($node['type'] !== 'group' && is_string($node['label'] ?? null)
						&& preg_match_all('/\{('.self::HOST_MACRO.')\}/', $node['label'], $matches)) {
					array_push($ids['macros'], ...$matches[1]);
				}
			}
		}

		foreach ($data['links'] ?? [] as $link) {
			if (!is_array($link)) {
				continue;
			}

			// Libellés à macros d'expression.
			if (is_string($link['label'] ?? null) && strpos($link['label'], '{?') !== false) {
				$ids['labels'][] = $link['label'];
			}

			// Déclencheurs des liens colorés selon « autre(s) déclencheur(s) ».
			if (($link['status'] ?? '') !== 'triggers' || !is_array($link['triggers'] ?? null)) {
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
