CREATE TABLE `rutas` (
	`id` text PRIMARY KEY NOT NULL,
	`ramal_id` text NOT NULL,
	`origen_latitud` real NOT NULL,
	`origen_longitud` real NOT NULL,
	`destino_latitud` real NOT NULL,
	`destino_longitud` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ramal_id`) REFERENCES `ramales`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_rutas_ramal_created` ON `rutas` (`ramal_id`,`created_at`);