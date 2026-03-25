# ─── Tag all resources into the existing DMF_MUSIC_PLATFORM Resource Group ───
#
# The group ARN:
#   arn:aws:resource-groups:us-east-2:041875151338:group/DMF_MUSIC_PLATFORM/0279j4x49uuuv4p4d99wfo5blr
#
# It uses tag-based membership. Any resource tagged with:
#   Project = "DMF_MUSIC_PLATFORM"
# will automatically appear in the group.
#
# The "Project" = "DMF_MUSIC_PLATFORM" tag is already applied to every
# resource via the provider default_tags block in main.tf (local.common_tags).
# ─────────────────────────────────────────────────────────────────────────────

# Reference the existing group (data source — we do NOT recreate it)
data "aws_resourcegroups_group" "dmf" {
  name = "DMF_MUSIC_PLATFORM"
}

output "resource_group_arn" {
  value = data.aws_resourcegroups_group.dmf.arn
}

# ─── CloudWatch Dashboard for quick visibility into all DMF resources ─────────

resource "aws_cloudwatch_dashboard" "dmf" {
  dashboard_name = "${local.name_prefix}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title   = "API Request Count"
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix]]
          period  = 300
          stat    = "Sum"
          view    = "timeSeries"
        }
        x = 0; y = 0; width = 12; height = 6
      },
      {
        type = "metric"
        properties = {
          title   = "API Response Latency (ms)"
          metrics = [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix]]
          period  = 300
          stat    = "p99"
          view    = "timeSeries"
        }
        x = 12; y = 0; width = 12; height = 6
      },
      {
        type = "metric"
        properties = {
          title   = "ECS API Running Tasks"
          metrics = [["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", "${local.name_prefix}-api"]]
          period  = 60
          stat    = "Average"
          view    = "timeSeries"
        }
        x = 0; y = 6; width = 12; height = 6
      },
      {
        type = "metric"
        properties = {
          title   = "RDS CPU Utilization"
          metrics = [["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id]]
          period  = 300
          stat    = "Average"
          view    = "timeSeries"
        }
        x = 12; y = 6; width = 12; height = 6
      }
    ]
  })
}
