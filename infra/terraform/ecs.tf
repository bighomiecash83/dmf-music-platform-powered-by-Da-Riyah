# ─── ECS Cluster ─────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${local.name_prefix}-ecs-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = var.environment == "prod" ? "FARGATE" : "FARGATE_SPOT"
    weight            = 1
  }
}

# ─── IAM Roles ───────────────────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name_prefix}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow ECS to pull secrets from Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "${local.name_prefix}-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.db_password.arn,
        aws_secretsmanager_secret.redis_auth.arn,
        aws_secretsmanager_secret.app_secrets.arn,
      ]
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Allow tasks to write CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_task_logs" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# ─── App Secrets (admin token, secret key, anthropic key) ────────────────────

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.name_prefix}/app/secrets"
  description             = "DMF Platform application secrets"
  recovery_window_in_days = 7
  tags                    = { Name = "${local.name_prefix}-secret-app" }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    ADMIN_TOKEN       = var.admin_token
    SECRET_KEY        = var.secret_key
    ANTHROPIC_API_KEY = var.anthropic_api_key
  })
}

# ─── CloudWatch Log Groups ───────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "/dmf/${var.environment}/dariyah-core"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/dmf/${var.environment}/worker"
  retention_in_days = 14
}

# ─── API Task Definition ─────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory

  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "dariyah-core"
    image     = "${aws_ecr_repository.api.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 8001
      protocol      = "tcp"
    }]

    environment = [
      { name = "LOG_LEVEL", value = "INFO" },
      { name = "PORT", value = "8001" },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DATABASE_URL::" },
      { name = "REDIS_URL", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:REDIS_URL::" },
      { name = "ADMIN_TOKEN", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:ADMIN_TOKEN::" },
      { name = "SECRET_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:SECRET_KEY::" },
      { name = "ANTHROPIC_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:ANTHROPIC_API_KEY::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = { Name = "${local.name_prefix}-api-task" }
}

# ─── Celery Worker Task Definition ───────────────────────────────────────────

resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.name_prefix}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024

  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "worker"
    image     = "${aws_ecr_repository.api.repository_url}:latest"
    essential = true

    command = [
      "celery", "-A", "app.workers.dsp_sync_worker.celery_app",
      "worker", "--loglevel=info", "--concurrency=4",
      "--queues=dsp,royalty,ai"
    ]

    environment = [
      { name = "LOG_LEVEL", value = "INFO" },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DATABASE_URL::" },
      { name = "REDIS_URL", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:REDIS_URL::" },
      { name = "CELERY_BROKER_URL", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:CELERY_BROKER_URL::" },
      { name = "CELERY_RESULT_BACKEND", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:CELERY_RESULT_BACKEND::" },
      { name = "ANTHROPIC_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:ANTHROPIC_API_KEY::" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])

  tags = { Name = "${local.name_prefix}-worker-task" }
}

# ─── ALB ─────────────────────────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = { Name = "${local.name_prefix}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-tg"
  port        = 8001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = { Name = "${local.name_prefix}-api-tg" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Redirect HTTP → HTTPS in prod; serve directly in dev
  dynamic "default_action" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.environment != "prod" ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.api.arn
    }
  }
}

# ─── ECS Services ────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api" {
  name            = "${local.name_prefix}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "dariyah-core"
    container_port   = 8001
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  depends_on = [aws_lb_listener.http]

  tags = { Name = "${local.name_prefix}-api-service" }
}

resource "aws_ecs_service" "worker" {
  name            = "${local.name_prefix}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = { Name = "${local.name_prefix}-worker-service" }
}

# ─── ALB access logs bucket ──────────────────────────────────────────────────

resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${local.name_prefix}-alb-logs-${var.aws_account_id}"
  force_destroy = true
  tags          = { Name = "${local.name_prefix}-alb-logs" }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::033677994240:root" } # us-east-2 ELB service account
      Action    = "s3:PutObject"
      Resource  = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${var.aws_account_id}/*"
    }]
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
