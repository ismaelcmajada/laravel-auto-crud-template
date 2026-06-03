<?php

namespace App\Models;

use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Auth\Authenticatable;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Database\Eloquent\Model;
use Ismaelcmajada\LaravelAutoCrud\Models\Traits\AutoCrud;

class User extends Model implements AuthenticatableContract
{
    use Authenticatable, HasApiTokens, Notifiable, SoftDeletes;
    use AutoCrud;

    protected static $endPoint = '/dashboard/user';

    protected static function getFields()
    {
        return [
            [
                'name' => 'Nombre',
                'field' => 'name',
                'type' => 'string',
                'table' => true,
                'form' => true,
                'rules' => [
                    'required' => true
                ]
            ],
            [
                'name' => 'Email',
                'field' => 'email',
                'type' => 'email',
                'table' => true,
                'form' => true,
                'rules' => [
                    'required' => true,
                    'unique' => true
                ]
            ],
            [
                'name' => 'Contraseña',
                'field' => 'password',
                'type' => 'password',
                'table' => false,
                'form' => true,
                'rules' => [
                    'required' => true
                ]
            ],
            [
                'name' => 'Rol',
                'field' => 'role',
                'type' => 'select',
                'table' => true,
                'form' => true,
                'options' => ['user', 'admin', 'super-admin'],
                'rules' => [
                    'required' => true
                ]
            ],
        ];
    }

    protected static $includes = [];

    protected static $externalRelations = [];

    protected static $forbiddenActions = [
        'admin' => [
            'destroy',
        ]
    ];

    protected static $calendarFields = [];

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($user) {
            if ($user->role === 'super-admin') {
                Redirect::back()->withErrors(['error' => 'No se puede eliminar un super-admin']);
                return false;
            }
        });

        static::creating(function ($user) {
            if ($user->role === 'super-admin') {
                Redirect::back()->withErrors(['error' => 'No se puede crear un super-admin']);
                return false;
            }
        });
    }
}
