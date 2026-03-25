variable "aws_region" {
  description = "AWS region — matches the DMF_MUSIC_PLATFORM resource group"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "environment must be prod, staging, or dev."
  }
}

variable "aws_account_id" {
  description = "AWS account ID that owns the resource group"
  type        = string
  default     = "041875151338"
}

# ─── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-2a", "us-east-2b", "us-east-2c"]
}

# ─── API ──────────────────────────────────────────────────────────────────────

variable "api_cpu" {
  description = "Fargate vCPU units for the API task"
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "api_memory" {
  description = "Fargate memory (MiB) for the API task"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API task replicas"
  type        = number
  default     = 2
}

variable "worker_desired_count" {
  description = "Desired number of Celery worker replicas"
  type        = number
  default     = 1
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "dmf"
}

variable "db_username" {
  type    = string
  default = "dmf_admin"
}

# ─── Redis ────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

# ─── Secrets (set via TF_VAR_* or terraform.tfvars, never hard-coded) ────────

variable "admin_token" {
  description = "Platform admin token — set via TF_VAR_admin_token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "secret_key" {
  description = "App secret key — set via TF_VAR_secret_key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key — set via TF_VAR_anthropic_api_key"
  type        = string
  sensitive   = true
  default     = ""
}
