<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use API;

/**
 * Statut temps réel des hôtes : problèmes actifs, maintenance, hôte désactivé.
 * Les droits de l'utilisateur sont appliqués par l'API (un hôte non visible n'est pas renvoyé).
 */
class HostStatus {

	public static function get(array $hostids): array {
		$hostids = array_values(array_unique($hostids));
		$status = [];

		if (!$hostids) {
			return $status;
		}

		$hosts = API::Host()->get([
			'output' => ['hostid', 'name', 'status', 'maintenance_status'],
			'hostids' => $hostids,
			'preservekeys' => true
		]);

		foreach ($hosts as $hostid => $host) {
			$status[$hostid] = [
				'name' => $host['name'],
				'disabled' => $host['status'] == HOST_STATUS_NOT_MONITORED,
				'maintenance' => $host['maintenance_status'] == HOST_MAINTENANCE_STATUS_ON,
				'problems' => []
			];
		}

		if (!$hosts) {
			return $status;
		}

		$problems = API::Problem()->get([
			'output' => ['eventid', 'objectid', 'name', 'severity', 'clock', 'acknowledged'],
			'source' => EVENT_SOURCE_TRIGGERS,
			'object' => EVENT_OBJECT_TRIGGER,
			'hostids' => array_keys($hosts),
			'suppressed' => false,
			'symptom' => false,
			'sortfield' => ['eventid'],
			'sortorder' => ZBX_SORT_DOWN
		]);

		if (!$problems) {
			return $status;
		}

		$triggers = API::Trigger()->get([
			'output' => [],
			'selectHosts' => ['hostid'],
			'triggerids' => array_unique(array_column($problems, 'objectid')),
			'preservekeys' => true
		]);

		foreach ($problems as $problem) {
			if (!array_key_exists($problem['objectid'], $triggers)) {
				continue;
			}

			foreach ($triggers[$problem['objectid']]['hosts'] as $trigger_host) {
				if (array_key_exists($trigger_host['hostid'], $status)) {
					$status[$trigger_host['hostid']]['problems'][] = [
						'eventid' => $problem['eventid'],
						'name' => $problem['name'],
						'severity' => (int) $problem['severity'],
						'clock' => (int) $problem['clock'],
						'acknowledged' => $problem['acknowledged'] == EVENT_ACKNOWLEDGED
					];
				}
			}
		}

		return $status;
	}

	/**
	 * Identifiants des hôtes Zabbix utilisés dans une carte.
	 */
	public static function mapHostids(array $data): array {
		$hostids = [];

		foreach ($data['nodes'] ?? [] as $node) {
			if (is_array($node) && ($node['type'] ?? '') === 'host' && ctype_digit((string) ($node['hostid'] ?? ''))) {
				$hostids[] = (string) $node['hostid'];
			}
		}

		return array_values(array_unique($hostids));
	}
}
