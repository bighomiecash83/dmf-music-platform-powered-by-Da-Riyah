# ─── Summary outputs for CI/CD + team reference ──────────────────────────────

output "platform_urls" {
  description = "Public access URLs"
  value = {
    frontend    = "https://${aws_cloudfront_distribution.frontend.domain_name}"
    api         = "http://${aws_lb.main.dns_name}"
    api_docs    = "http://${aws_lb.main.dns_name}/docs"
  }
}

output "aws_resource_group_arn" {
  description = "The AWS Resource Group this deployment targets"
  value       = "arn:aws:resource-groups:${var.aws_region}:${var.aws_account_id}:group/DMF_MUSIC_PLATFORM/0279j4x49uuuv4p4d99wfo5blr"
}

output "ecr_push_commands" {
  description = "Commands to push images to ECR"
  value = {
    login  = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    api    = "docker build -t ${aws_ecr_repository.api.repository_url}:latest ./services/dariyah-core && docker push ${aws_ecr_repository.api.repository_url}:latest"
    web    = "docker build -t ${aws_ecr_repository.frontend.repository_url}:latest ./apps/frontend && docker push ${aws_ecr_repository.frontend.repository_url}:latest"
  }
}

output "deploy_frontend_command" {
  description = "Deploy built frontend to S3 + invalidate CloudFront"
  value       = "aws s3 sync apps/frontend/dist s3://${aws_s3_bucket.frontend.id} --delete && aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.frontend.id} --paths '/*'"
}
