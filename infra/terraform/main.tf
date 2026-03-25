terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment after creating the S3 bucket + DynamoDB table for state
  # backend "s3" {
  #   bucket         = "dmf-music-platform-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-2"
  #   dynamodb_table = "dmf-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# ─── Locals ──────────────────────────────────────────────────────────────────

locals {
  name_prefix = "dmf-${var.environment}"

  # These tags cause all resources to be picked up by the
  # arn:aws:resource-groups:us-east-2:041875151338:group/DMF_MUSIC_PLATFORM/…
  # resource group (tag-based membership).
  common_tags = {
    Project     = "DMF_MUSIC_PLATFORM"
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "dariyah"
  }
}
