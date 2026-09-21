# --- Secrets (never commit values; Terraform only creates empty placeholders) ---
resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  recovery_window_in_days = 7
}

# --- RDS PostgreSQL 16: encrypted, Multi-AZ, daily snapshots, India region ---
resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_parameter_group" "pg16" {
  name   = "${local.name}-pg16"
  family = "postgres16"
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
}

resource "aws_db_instance" "postgres" {
  identifier               = "${local.name}-pg"
  engine                   = "postgres"
  engine_version           = "16"
  instance_class           = var.db_instance_class
  allocated_storage        = 20
  max_allocated_storage    = 100
  db_name                  = var.db_name
  username                 = var.db_username
  manage_master_user_password = true
  db_subnet_group_name     = aws_db_subnet_group.main.name
  vpc_security_group_ids   = [aws_security_group.data.id]
  parameter_group_name     = aws_db_parameter_group.pg16.name
  multi_az                 = true
  storage_encrypted        = true
  backup_retention_period  = 7
  backup_window            = "19:30-20:00" # ~01:00-01:30 IST
  maintenance_window       = "sun:20:00-sun:21:00"
  deletion_protection      = true
  copy_tags_to_snapshot    = true
  performance_insights_enabled = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "${local.name}-pg-final"
}

# --- ElastiCache Redis 7 (queue + cache) ---
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name}-redis"
  description          = "BullMQ queue for ${local.name}"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 2
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.data.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true
}
