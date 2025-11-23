'use client'

import * as React from 'react'
import {
  Card as MuiCard,
  CardContent as MuiCardContent,
  CardHeader as MuiCardHeader,
  CardTitle as MuiCardTitle,
  CardDescription as MuiCardDescription,
  CardFooter as MuiCardFooter,
  CardProps as MuiCardProps,
  CardContentProps,
  CardHeaderProps,
  Box,
  Typography,
} from '@mui/material'

export interface CardProps extends MuiCardProps {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <MuiCard ref={ref} {...props} />
})

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return <MuiCardHeader ref={ref} {...props} />
  }
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <Typography
        ref={ref}
        variant="h5"
        component="h3"
        sx={{ fontWeight: 600, fontFamily: 'Exo, sans-serif' }}
        {...props}
      >
        {children}
      </Typography>
    )
  }
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <Typography
      ref={ref}
      variant="body2"
      color="text.secondary"
      sx={{ fontFamily: 'Nunito, sans-serif' }}
      {...props}
    >
      {children}
    </Typography>
  )
})

CardDescription.displayName = 'CardDescription'

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <MuiCardContent ref={ref} {...props} />
  }
)

CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <Box
        ref={ref}
        sx={{ display: 'flex', alignItems: 'center', p: 3, pt: 0 }}
        {...props}
      />
    )
  }
)

CardFooter.displayName = 'CardFooter'
