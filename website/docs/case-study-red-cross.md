# Case: Red Cross Norway Volunteer Developer Platform

> This content was originally part of the project README. It is preserved here for the future Docusaurus documentation site.

---

## Executive Summary

The urbalurba-infrastructure provides the stuff needed to make development fun and easy for developers.

It provides a development platform that developers can use to develop, test and deploy their systems without deep knowledge about underlying infrastructure like kubernetes, GitOps and other fancy terms.

A developer should be free to write code and not worry about the underlying infrastructure.

Urbalurba-infrastructure sets up a local kubernetes cluster that follow the latest GitOps principles and provides a set of tools that makes it easy to develop, test and deploy applications.
Providing a seamless developer experience consistent with latest tooling and workflows.

## The Challenge

The Norwegian Red Cross supports over **40,000 volunteers** across **380+ local branches**, many of whom have technical skills and see opportunities for IT improvements. This solution creates a streamlined path for these volunteers to develop, test, and contribute IT solutions that can ultimately be adopted by the organization, enabling a better flow from volunteer innovation to organizational adoption.

Among these volunteers are **programmers and software engineers** who participate in roles like "Besoksvenn" or "Nattvandrer". Through their firsthand experience, they see how **IT systems can improve daily operations and volunteer effectiveness**.

However, the Red Cross currently lacks a structured way to **receive, evaluate, and integrate** the IT solutions these volunteers develop. When a volunteer creates something that solves a real problem locally, there's no streamlined way for the IT department to bring that solution into production. This results in a **loss of value** for the organization and **frustration** for both the volunteers and IT staff. What begins as a solution becomes a problem—simply because we don't have the infrastructure to receive and adopt it.

This document describes a solution: a **local development platform and workflow** that allows volunteers and developers—whether internal or external—to contribute effectively and securely.

## Benefits

### For Volunteers and Developers

- **Lower barrier to entry** for technical volunteers and new developers
- **Self-service setup** that reduces onboarding time
- **Fast feedback** through local testing and deployment
- **Familiar tools** like VS Code, GitHub, and modern frameworks
- **Production-like environment** for testing applications

### For Red Cross IT Department

- **Predictable and maintainable** application structure
- **Standardized project templates** that follow best practices
- **Seamless handover** of code from volunteers to IT staff
- **Scalable model** that supports multiple projects and contributors
- **Reduced integration overhead** when adopting volunteer-created solutions

### For the Organization

- **Harness volunteer technical skills** more effectively
- **Accelerate innovation** from field operations to organization-wide solutions
- **Improve volunteer experience** by providing professional-grade tools
- **Ensure security and compliance** through standardized infrastructure
- **Enable collaboration** between volunteers, staff, and external partners

## Conclusion

By providing a simple, flexible, and powerful local development setup, the Norwegian Red Cross can harness the technical skills of its volunteers and staff to build better systems. With GitOps and Kubernetes as the foundation, and with automation and templates smoothing the path, we can ensure that good ideas from the field don't get lost—they get adopted, improved, and brought into production.

This platform enables collaboration, learning, and innovation—and most importantly, helps support volunteers more effectively as they help others. The ArgoCD integration creates a seamless development experience for Red Cross developers and volunteers, allowing them to focus on building valuable solutions instead of dealing with complex infrastructure.

The GitOps approach ensures consistent, automated deployments while the scripted setup minimizes the learning curve. By implementing this strategy, the Red Cross platform will meet the goals outlined in the project overview: enabling volunteers to contribute effectively, providing a consistent development environment, and ensuring that good ideas can be quickly brought into production.
