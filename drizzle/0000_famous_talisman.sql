CREATE TABLE `levantamientos` (
	`id` text PRIMARY KEY NOT NULL,
	`ramal_id` text NOT NULL,
	`circuito` text NOT NULL,
	`ubicacion` text NOT NULL,
	`latitud` real NOT NULL,
	`longitud` real NOT NULL,
	`podas` integer NOT NULL,
	`cuadrillas` integer NOT NULL,
	`fecha` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ramal_id`) REFERENCES `ramales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_levantamientos_ramal_fecha` ON `levantamientos` (`ramal_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `ramales` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`nombre_key` text NOT NULL,
	`subestacion` text NOT NULL,
	`circuitos` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ramales_nombre_key` ON `ramales` (`nombre_key`);