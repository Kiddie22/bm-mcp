import { Controller, Get, Param, Body, Post, Put } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Get all users
  @Get('users')
  getUsers(): any {
    return this.appService.getUsers();
  }

  // Get user by ID
  @Get('users/:id')
  getUserById(@Param('id') id: string): any {
    return this.appService.getUserById(id);
  }

  // Get FX rate
  @Get('fx')
  getFxRate() {
    return { fxRate: this.appService.getFxRate() };
  }

  // Update FX rate
  @Put('fx')
  setFxRate(@Body('rate') rate: number) {
    this.appService.setFxRate(rate);
    return { fxRate: this.appService.getFxRate() };
  }

  // Transfer funds between accounts
  @Post('transfer')
  transfer(@Body() body: { userId: string; from: 'AUD' | 'USD'; to: 'AUD' | 'USD'; amount: number }): any {
    // This will call a method to be implemented in AppService
    return this.appService.transferFunds(body.userId, body.from, body.to, body.amount);
  }
}
